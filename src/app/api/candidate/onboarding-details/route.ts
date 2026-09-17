import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/candidate/onboarding-details
 *
 * Returns the candidate's onboarding form data + whether onboarding is complete.
 * Used by the first-login onboarding page to pre-fill fields and by the login
 * flow to decide whether to redirect to /onboarding/details.
 *
 * Response: {
 *   onboarding_completed: boolean,
 *   profile: {
 *     first_name, last_name, email, phone,
 *     job_title, specialty,
 *     city, state, zip_code,
 *     years_experience_total, years_experience_specialty,
 *     referral_source
 *   }
 * }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
      select: {
        first_name: true,
        last_name: true,
        phone: true,
        job_title: true,
        specialty: true,
        city: true,
        state: true,
        zip_code: true,
        years_experience_total: true,
        years_experience_specialty: true,
        referral_source: true,
        onboarding_completed_at: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    return NextResponse.json({
      onboarding_completed: !!profile.onboarding_completed_at,
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: user?.email ?? "",
        phone: profile.phone,
        job_title: profile.job_title ?? "",
        specialty: profile.specialty ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        zip_code: profile.zip_code ?? "",
        years_experience_total: profile.years_experience_total ?? null,
        years_experience_specialty: profile.years_experience_specialty ?? null,
        referral_source: profile.referral_source ?? "",
      },
    });
  } catch (error: any) {
    console.error("[ONBOARDING_DETAILS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch onboarding details" }, { status: 500 });
  }
}

/**
 * PUT /api/candidate/onboarding-details
 *
 * Saves the first-login onboarding form. Sets onboarding_completed_at = NOW()
 * so the candidate is never redirected to the onboarding page again.
 *
 * Body: {
 *   first_name: string,         // required
 *   last_name: string,          // required
 *   phone: string,              // required
 *   job_title: string,          // required
 *   specialty: string,          // required
 *   city: string,               // required
 *   state: string,              // required (2-char US state code)
 *   zip_code: string,           // required
 *   years_experience_total: number,     // required
 *   years_experience_specialty: number, // required
 *   referral_source: string     // optional ("Where did you hear about us?")
 * }
 *
 * Response: { success: true, onboarding_completed: true }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // ── Validate required fields ──
    const required = [
      "first_name", "last_name", "phone",
      "job_title", "specialty",
      "city", "state", "zip_code",
      "years_experience_total", "years_experience_specialty",
    ];
    const missing = required.filter((f) => {
      const v = body[f];
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // ── Validate + normalize ──
    const firstName = String(body.first_name).trim().slice(0, 100);
    const lastName = String(body.last_name).trim().slice(0, 100);
    const phone = String(body.phone).trim().slice(0, 20);
    const jobTitle = String(body.job_title).trim().slice(0, 100);
    const specialty = String(body.specialty).trim().slice(0, 100);
    const city = String(body.city).trim().slice(0, 100);
    const state = String(body.state).trim().toUpperCase().slice(0, 2);
    const zipCode = String(body.zip_code).trim().slice(0, 10);
    const yearsTotal = parseInt(body.years_experience_total, 10);
    const yearsSpecialty = parseInt(body.years_experience_specialty, 10);
    const referralSource = body.referral_source
      ? String(body.referral_source).trim().slice(0, 255)
      : null;

    if (!/^[A-Z]{2}$/.test(state)) {
      return NextResponse.json(
        { error: "State must be a 2-letter US state code (e.g. TX, CA)" },
        { status: 400 },
      );
    }
    if (isNaN(yearsTotal) || yearsTotal < 0 || yearsTotal > 80) {
      return NextResponse.json(
        { error: "Total years of experience must be a number between 0 and 80" },
        { status: 400 },
      );
    }
    if (isNaN(yearsSpecialty) || yearsSpecialty < 0 || yearsSpecialty > 80) {
      return NextResponse.json(
        { error: "Years of experience in current specialty must be a number between 0 and 80" },
        { status: 400 },
      );
    }
    if (yearsSpecialty > yearsTotal) {
      return NextResponse.json(
        { error: "Specialty experience cannot exceed total experience" },
        { status: 400 },
      );
    }

    // ── Update profile ──
    const existing = await db.candidateProfile.findUnique({ where: { user_id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 },
      );
    }

    await db.candidateProfile.update({
      where: { user_id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        job_title: jobTitle,
        specialty,
        city,
        state,
        zip_code: zipCode,
        years_experience_total: yearsTotal,
        years_experience_specialty: yearsSpecialty,
        referral_source: referralSource,
        onboarding_completed_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      onboarding_completed: true,
    });
  } catch (error: any) {
    console.error("[ONBOARDING_DETAILS_PUT]", error);
    return NextResponse.json({ error: "Failed to save onboarding details" }, { status: 500 });
  }
}
