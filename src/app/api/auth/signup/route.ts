import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, recordRateLimitAttempt, getClientIp } from "@/lib/rate-limiter";
import { signupSchema, validateBody } from "@/lib/validation-schemas";
import { logAuthError } from "@/lib/auth-logger";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    // ─── Gap 9: Rate limit signup — max 3 per IP per hour ───
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit("signup", clientIp, 3, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many signups from this IP. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
          retryAfter: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // ─── Zod validation ───
    const validation = validateBody(signupSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { email, password, firstName, lastName } = validation.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      // Record this attempt to prevent email enumeration via timing
      await recordRateLimitAttempt("signup", clientIp, 3600);
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Record the rate limit attempt (counts toward the 3/hour limit)
    await recordRateLimitAttempt("signup", clientIp, 3600);

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role: "candidate",
        first_name: firstName || null,
        last_name: lastName || null,
        is_approved: true,
        account_status: "active",
        // email_verified_at is null by default — user must verify
      },
    });

    await db.candidateProfile.create({
      data: {
        user_id: user.id,
        first_name: firstName || "",
        last_name: lastName || "",
        phone: "",
        profile_completion_pct: firstName && lastName ? 10 : 0,
      },
    });

    // Send verification email
    try {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await db.platformSetting.upsert({
        where: { setting_key: `verify_${verifyToken}` },
        update: {
          setting_value: JSON.stringify({
            userId: user.id,
            email: user.email,
            expiresAt,
          }),
        },
        create: {
          setting_key: `verify_${verifyToken}`,
          setting_value: JSON.stringify({
            userId: user.id,
            email: user.email,
            expiresAt,
          }),
        },
      });

      const verificationLink = `${BASE_URL}/verify-email?token=${verifyToken}`;
      await sendVerificationEmail(user.email, verificationLink);
      console.log(`[AUDIT] Verification email sent on signup — user: ${user.id}, email: ${user.email}`);
    } catch (emailError) {
      logAuthError("[SIGNUP] Failed to send verification email", emailError);
      // Don't fail signup if email sending fails
    }

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    logAuthError("[SIGNUP]", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
