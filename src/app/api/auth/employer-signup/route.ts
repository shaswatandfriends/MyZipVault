import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, recordRateLimitAttempt, getClientIp } from "@/lib/rate-limiter";
import { logAuthError } from "@/lib/auth-logger";
import { z } from "zod";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const employerSignupSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email").max(255).transform(v => v.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128).regex(/[A-Z]/, "Must contain an uppercase letter").regex(/[a-z]/, "Must contain a lowercase letter").regex(/[0-9]/, "Must contain a number"),
  firstName: z.string().min(1, "First name is required").max(100).transform(v => v.trim()),
  lastName: z.string().min(1, "Last name is required").max(100).transform(v => v.trim()),
  companyName: z.string().min(1, "Company name is required").max(200).transform(v => v.trim()),
  companyAddress: z.string().max(500).optional().nullable(),
  companyWebsite: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable().transform(v => v?.trim() || null),
});

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit("employer_signup", clientIp, 3, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many signups. Please try again in ${rateLimit.retryAfterSeconds} seconds.`, retryAfter: rateLimit.retryAfterSeconds },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = employerSignupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { email, password, firstName, lastName, companyName, companyAddress, companyWebsite, phone } = validation.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await recordRateLimitAttempt("employer_signup", clientIp, 3600);
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    await recordRateLimitAttempt("employer_signup", clientIp, 3600);
    const passwordHash = await hash(password, 12);

    // Create organization first (employer's company)
    const organization = await db.organization.create({
      data: {
        name: companyName,
        account_status: "active",
        baa_status: "none",
        seat_limit: 1,
        company_address: companyAddress || null,
        company_website: companyWebsite || null,
      },
    });

    // Create the employer user
    const user = await db.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role: "employer",
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        organization_id: organization.id,
        is_approved: true,
        account_status: "active",
      },
    });

    // Send verification email
    try {
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db.platformSetting.upsert({
        where: { setting_key: `verify_${verifyToken}` },
        update: { setting_value: JSON.stringify({ userId: user.id, email: user.email, expiresAt }) },
        create: { setting_key: `verify_${verifyToken}`, setting_value: JSON.stringify({ userId: user.id, email: user.email, expiresAt }) },
      });
      const verificationLink = `${BASE_URL}/verify-email?token=${verifyToken}`;
      await sendVerificationEmail(user.email, verificationLink);
      console.log(`[EMPLOYER_SIGNUP] Verification email sent — user: ${user.id}, email: ${user.email}`);
    } catch (emailError) {
      logAuthError("[EMPLOYER_SIGNUP] Failed to send verification email", emailError);
    }

    return NextResponse.json({ message: "Employer account created successfully", userId: user.id }, { status: 201 });
  } catch (error) {
    logAuthError("[EMPLOYER_SIGNUP]", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

import crypto from "crypto";
