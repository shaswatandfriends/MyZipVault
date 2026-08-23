import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, recordRateLimitAttempt, getClientIp } from "@/lib/rate-limiter";
import { signupSchema, validateBody } from "@/lib/validation-schemas";
import { logAuthError } from "@/lib/auth-logger";
import { findReferrer, grantReferralCredits } from "@/lib/referrals";

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

    // ─── Marketplace: Candidate self-claim ────────────────────────────
    // If a CandidateRecord exists in the platform pool (the 1M healthcare
    // data) with a matching email, link it to this new User account. This
    // lets the candidate "claim" their existing profile instead of starting
    // fresh — they'll have their existing specialty, location, etc.
    //
    // This is NON-BLOCKING — if it fails (e.g., migration not applied yet),
    // signup still succeeds. The user just gets a fresh profile.
    try {
      const normalizedEmail = user.email.trim().toLowerCase();
      // Find the candidate contact info by normalized email
      const existingContact = await db.candidateContactInfo.findFirst({
        where: {
          type: "email",
          value_normalized: normalizedEmail,
          deleted_at: null,
        },
        select: {
          id: true,
          candidate_record_id: true,
          candidate_record: {
            select: {
              id: true,
              claimed_by_user_id: true,
              first_name: true,
              last_name: true,
              specialty: true,
              state: true,
              city: true,
              job_title: true,
            },
          },
        },
      });

      if (existingContact && !existingContact.candidate_record.claimed_by_user_id) {
        // Link the candidate record to this user
        await db.candidateRecord.update({
          where: { id: existingContact.candidate_record_id },
          data: {
            claimed_by_user_id: user.id,
            claimed_at: new Date(),
          },
        });

        // Also update the candidate profile with any info from the pool
        // record (specialty, location, etc.) if the user didn't provide it
        const poolRecord = existingContact.candidate_record;
        if (poolRecord.first_name && !firstName) {
          await db.candidateProfile.update({
            where: { user_id: user.id },
            data: { first_name: poolRecord.first_name },
          });
        }
        if (poolRecord.last_name && !lastName) {
          await db.candidateProfile.update({
            where: { user_id: user.id },
            data: { last_name: poolRecord.last_name },
          });
        }

        // Send notification to the candidate
        try {
          const { createNotification } = await import("@/lib/notifications/create");
          await createNotification({
            userId: user.id,
            category: "system",
            priority: "info",
            title: "Profile linked ✓",
            message: `We found your profile in our healthcare candidate pool${poolRecord.specialty ? ` (${poolRecord.specialty})` : ""}. Your information has been auto-filled — please review and complete any missing details.`,
            actionUrl: "/settings",
            actionLabel: "Review profile",
          });
        } catch (notifErr) {
          console.error("[SIGNUP_CLAIM] Failed to send claim notification:", notifErr);
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[SIGNUP_CLAIM] User ${user.id} (${user.email}) claimed CandidateRecord ${existingContact.candidate_record_id}`);
        }
      }
    } catch (claimErr) {
      console.error("[SIGNUP_CLAIM] Failed to link candidate record:", claimErr);
      // Non-blocking — user still has a valid account
    }

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
      if (process.env.NODE_ENV === "development") {
        console.log(`[AUDIT] Verification email sent on signup — user: ${user.id}, email: ${user.email}`);
      }
    } catch (emailError) {
      logAuthError("[SIGNUP] Failed to send verification email", emailError);
      // Don't fail signup if email sending fails
    }

    // ─── Referral: if the request body or cookie has a ref code, grant
    // credits to the referrer (or just record it for candidate referrers). ──
    try {
      // Body may include `ref` (sent from the client); fall back to the
      // `mzv_ref` cookie if not in the body.
      const refCode = (body.ref as string | undefined) || "";
      const referrer = await findReferrer(refCode);
      if (referrer && referrer.id !== user.id) {
        await grantReferralCredits({
          referrerId: referrer.id,
          referredUserId: user.id,
          referredEmail: user.email,
        });
      }
    } catch (refErr) {
      console.error("[SIGNUP_REFERRAL] Failed to process referral:", refErr);
      // Non-blocking — signup still succeeds
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
