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

        // ── Superadmin OTP login ──
        if (credentials.email === "__superadmin__" && credentials.password.startsWith("otp:")) {
          if (!SUPERADMIN_EMAIL) {
            throw new Error("Super admin login is not configured");
          }

          const otpCode = credentials.password.slice(4);

          const user = await db.user.findUnique({
            where: { email: SUPERADMIN_EMAIL },
          });

          if (!user || user.role !== "super_admin") {
            throw new Error("Invalid credentials");
          }

          if (user.accountStatus === "suspended" || user.accountStatus === "deleted" || user.accountStatus === "suspended_deleting") {
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
          throw new Error("Invalid email or password");
        }

        if (user.accountStatus === "suspended" || user.accountStatus === "deleted" || user.accountStatus === "suspended_deleting") {
          throw new Error("Account is not active. Please contact support.");
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
          throw new Error("Invalid email or password");
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
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string;
        token.organizationId = (user as Record<string, unknown>).organizationId as number | null;
        token.isApproved = (user as Record<string, unknown>).isApproved as boolean;
        token.firstName = (user as Record<string, unknown>).firstName as string | null;
        token.lastName = (user as Record<string, unknown>).lastName as string | null;
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
