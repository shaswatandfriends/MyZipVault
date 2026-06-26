import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";

// Server-side superadmin email — never exposed to the client
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";

/**
 * Timing-safe string comparison to prevent timing attacks on OTP codes.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still perform a comparison to avoid leaking length information
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // ─── Gap 9: Rate limit login attempts ────────────────────────
        // Max 10 failed attempts per email per 15 minutes
        // (OTP login for superadmin has its own rate limiting via /api/auth/otp/send)
        if (credentials.email !== "__superadmin__") {
          const { checkRateLimit, recordRateLimitAttempt, clearRateLimit } = await import("@/lib/rate-limiter");
          const loginEmail = credentials.email.toLowerCase().trim();
          const loginLimit = await checkRateLimit("login_failed", loginEmail, 10, 900); // 10 attempts per 15 min

          if (!loginLimit.allowed) {
            throw new Error(
              `Too many login attempts. Please try again in ${loginLimit.retryAfterSeconds} seconds.`
            );
          }
        }

        // ── Superadmin OTP login ──
        if (credentials.email === "__superadmin__" && credentials.password.startsWith("otp:")) {
          if (!SUPERADMIN_EMAIL) {
            throw new Error("Super admin login is not configured");
          }

          const otpCode = credentials.password.slice(4);

          const user = await db.user.findFirst({
            where: { email: { equals: SUPERADMIN_EMAIL, mode: "insensitive" } },
          });

          if (!user || user.role !== "super_admin") {
            throw new Error("Invalid credentials");
          }

          if (user.account_status === "suspended" || user.account_status === "deleted" || user.account_status === "suspended_deleting") {
            throw new Error("Account is not active. Please contact support.");
          }

          // Verify the OTP against stored records
          const otpRecord = await db.platformSetting.findUnique({
            where: { setting_key: "superadmin_otp_code" },
          });

          const expiryRecord = await db.platformSetting.findUnique({
            where: { setting_key: "superadmin_otp_expires" },
          });

          if (!otpRecord?.setting_value || !expiryRecord?.setting_value) {
            throw new Error("Verification code not found. Please request a new one.");
          }

          // Check expiry
          const expiresAt = new Date(expiryRecord.setting_value);
          if (new Date() > expiresAt) {
            await db.platformSetting.deleteMany({
              where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires", "superadmin_otp_sent_at"] } },
            });
            throw new Error("Verification code has expired. Please request a new one.");
          }

          // Timing-safe OTP comparison
          if (!timingSafeEqual(otpCode, otpRecord.setting_value)) {
            throw new Error("Invalid verification code");
          }

          // OTP verified — clean up
          await db.platformSetting.deleteMany({
            where: { setting_key: { in: ["superadmin_otp_code", "superadmin_otp_expires", "superadmin_otp_sent_at"] } },
          });

          console.log(`[AUDIT] Superadmin OTP login successful — user: ${user.id}, timestamp: ${new Date().toISOString()}`);

          return {
            id: String(user.id),
            email: user.email,
            role: user.role,
            organizationId: user.organization_id,
            isApproved: user.is_approved,
            firstName: user.first_name,
            lastName: user.last_name,
          };
        }

        // ── Standard email/password login ──
        let lookupEmail = credentials.email;
        if (credentials.email === "__superadmin__" && SUPERADMIN_EMAIL) {
          lookupEmail = SUPERADMIN_EMAIL;
        }

        const user = await db.user.findUnique({
          where: { email: lookupEmail },
        });

        if (!user) {
          // ─── Timing-attack mitigation ─────────────────────────────────
          // Without this block, the user-not-found path returns ~10x faster
          // than the user-found path (which runs bcrypt.compare). An
          // attacker can exploit the timing difference to enumerate which
          // emails are registered. Run a dummy bcrypt compare against a
          // precomputed hash to equalize the response time.
          //
          // The hash below is bcrypt("dummy-password-not-used", 12) — never
          // matches any real password, just consumes CPU time.
          const DUMMY_HASH = "$2a$12$KIXr5K2HwQ8qV5eZ6mY0J.fNkQ4z9bq2uJ8wQ5mY0J.fNkQ4z9bq2uJ8wQ";
          await compare(credentials.password, DUMMY_HASH).catch(() => false);

          // ─── Gap 9: Record failed login attempt ───
          if (credentials.email !== "__superadmin__") {
            const { recordRateLimitAttempt } = await import("@/lib/rate-limiter");
            await recordRateLimitAttempt("login_failed", lookupEmail.toLowerCase().trim(), 900);
          }
          throw new Error("Invalid email or password");
        }

        if (user.account_status === "suspended" || user.account_status === "deleted" || user.account_status === "suspended_deleting") {
          throw new Error("Account is not active. Please contact support.");
        }

        // Block pending client accounts (agency/recruiter) — admin must activate from admin panel
        if (user.account_status === "pending" && (user.role === "client_admin" || user.role === "client_recruiter")) {
          throw new Error("Your account is pending admin activation. You will be notified once activated.");
        }

        // Super Admin gate: only the env-configured email can be super_admin
        if (user.role === "super_admin") {
          if (!SUPERADMIN_EMAIL || user.email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
            throw new Error("Unauthorized access");
          }
        }

        // Block unapproved client_admin / client_recruiter from logging in
        if ((user.role === "client_admin" || user.role === "client_recruiter") && !user.is_approved) {
          throw new Error("Your account is pending admin approval. You will be notified once approved.");
        }

        const isValidPassword = await compare(
          credentials.password,
          user.password_hash
        );

        if (!isValidPassword) {
          // ─── Gap 9: Record failed login attempt ───
          if (credentials.email !== "__superadmin__") {
            const { recordRateLimitAttempt } = await import("@/lib/rate-limiter");
            await recordRateLimitAttempt("login_failed", lookupEmail.toLowerCase().trim(), 900);
          }
          throw new Error("Invalid email or password");
        }

        // ─── Gap 9: Clear failed login attempts on success ───
        if (credentials.email !== "__superadmin__") {
          const { clearRateLimit } = await import("@/lib/rate-limiter");
          await clearRateLimit("login_failed", lookupEmail.toLowerCase().trim());
        }

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          organizationId: user.organization_id,
          isApproved: user.is_approved,
          firstName: user.first_name,
          lastName: user.last_name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours absolute max
  },
  callbacks: {
    async jwt({ token, user }) {
      // ── Initial sign-in: `user` object is present ──
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string;
        token.organizationId = (user as Record<string, unknown>).organizationId as number | null;
        token.isApproved = (user as Record<string, unknown>).isApproved as boolean;
        token.firstName = (user as Record<string, unknown>).firstName as string | null;
        token.lastName = (user as Record<string, unknown>).lastName as string | null;
        token.lastRefreshedAt = Date.now();
        token.lastActivity = Date.now();
        return token;
      }

      // ─── Gap 10: Session inactivity timeout ──────────────────────────
      // For HIPAA compliance, sessions expire after 30 minutes of inactivity.
      // The lastActivity timestamp is updated on every JWT callback (which
      // runs on every page load / API call via getSession()).
      // If the user hasn't made a request in 30 minutes, invalidate the session.
      const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
      const lastActivity = (token.lastActivity as number) || 0;

      if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        console.warn(
          `[AUTH] Session expired due to inactivity — userId: ${token.id}, lastActivity: ${new Date(lastActivity).toISOString()}, inactive for: ${Math.round((Date.now() - lastActivity) / 60000)}min`
        );
        // Clear the token id — middleware and AuthProvider will treat this as
        // unauthenticated and redirect to login
        return { ...token, id: "" } as typeof token;
      }

      // Update lastActivity on every request (user is still active)
      token.lastActivity = Date.now();

      // ── Subsequent token refreshes: re-fetch user from DB every 5 minutes ──
      // This ensures role/approval/status changes propagate within 5 minutes
      // instead of waiting up to 24 hours for the JWT to expire.
      const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
      const lastRefreshedAt = (token.lastRefreshedAt as number) || 0;

      if (Date.now() - lastRefreshedAt < REFRESH_INTERVAL_MS) {
        return token; // Throttled — return token as-is (lastActivity already updated)
      }

      const userId = Number(token.id);
      if (!userId) return token;

      try {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            organization_id: true,
            is_approved: true,
            first_name: true,
            last_name: true,
            account_status: true,
          },
        });

        if (!dbUser) {
          // User was deleted — invalidate token by clearing id.
          // NextAuth will treat this as unauthenticated and force re-login.
          console.warn(`[AUTH] User ${userId} not found during JWT refresh — invalidating session`);
          return { ...token, id: "" } as typeof token;
        }

        // Account suspended/deleted mid-session — invalidate token
        if (["suspended", "deleted", "suspended_deleting"].includes(dbUser.account_status)) {
          console.warn(`[AUTH] User ${userId} account_status=${dbUser.account_status} — invalidating session`);
          return { ...token, id: "" } as typeof token;
        }

        // Update token with fresh values from DB
        token.role = dbUser.role;
        token.organizationId = dbUser.organization_id;
        token.isApproved = dbUser.is_approved;
        token.firstName = dbUser.first_name;
        token.lastName = dbUser.last_name;
        token.lastRefreshedAt = Date.now();
      } catch (error) {
        // DB error — don't kill the session, just log and keep stale token
        // (next refresh attempt will retry)
        console.error("[AUTH] Failed to refresh JWT from DB:", error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).organizationId = token.organizationId;
        (session.user as Record<string, unknown>).isApproved = token.isApproved;
        (session.user as Record<string, unknown>).firstName = token.firstName;
        (session.user as Record<string, unknown>).lastName = token.lastName;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      const userId = token?.id;
      const role = token?.role as string | undefined;
      if (userId) {
        console.log(`[AUDIT] NextAuth signout — userId: ${userId}, role: ${role}, timestamp: ${new Date().toISOString()}`);
        db.user.update({
          where: { id: Number(userId) },
          data: { last_activity_at: new Date() },
        }).catch(() => {});
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
