import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Force dynamic rendering — never cache this route.
// This prevents Next.js from caching the response, which could cause
// stale onboarding_completed values and redirect loops.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/candidate/onboarding-details
 *
 * Returns the candidate's onboarding form data + whether onboarding is complete.
 *
 * Onboarding is complete ONLY if ALL required fields are filled:
 *   first_name, last_name, phone, job_title, specialty,
 *   city, state, zip_code, years_experience_total, years_experience_specialty
 * AND onboarding_completed_at is set.
 *
 * Response: {
 *   onboarding_completed: boolean,
 *   profile: { ... }
 * }
 *
 * CRITICAL: This route must NEVER be cached. If it returns stale data,
 * the candidate gets stuck in a redirect loop between dashboard and
 * onboarding page. The `dynamic = "force-dynamic"` + `revalidate = 0`
 * + Cache-Control: no-store headers ensure every request hits the DB.
 */
export async function GET(request: NextRequest) {
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

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
      select: {
        first_name: true,
        middle_name: true,
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

    // If profile doesn't exist (orphaned user), return not-onboarded.
    if (!profile) {
      return NextResponse.json({
        onboarding_completed: false,
        profile: {
          first_name: "",
          middle_name: "",
          last_name: "",
          email: user?.email ?? "",
          phone: "",
          job_title: "",
          specialty: "",
          city: "",
          state: "",
          zip_code: "",
          years_experience_total: null,
          years_experience_specialty: null,
          referral_source: "",
        },
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      });
    }

    // Onboarding is complete ONLY if ALL required fields are filled.
    const requiredFieldsFilled =
      !!profile.first_name &&
      !!profile.last_name &&
      !!profile.phone &&
      !!profile.job_title &&
      !!profile.specialty &&
      !!profile.city &&
      !!profile.state &&
      !!profile.zip_code &&
      profile.years_experience_total !== null &&
      profile.years_experience_total !== undefined &&
      profile.years_experience_specialty !== null &&
      profile.years_experience_specialty !== undefined;

    const onboardingCompleted = !!profile.onboarding_completed_at && requiredFieldsFilled;

    return NextResponse.json({
      onboarding_completed: onboardingCompleted,
      profile: {
        first_name: profile.first_name ?? "",
        middle_name: profile.middle_name ?? "",
        last_name: profile.last_name ?? "",
        email: user?.email ?? "",
        phone: profile.phone ?? "",
        job_title: profile.job_title ?? "",
        specialty: profile.specialty ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        zip_code: profile.zip_code ?? "",
        years_experience_total: profile.years_experience_total ?? null,
        years_experience_specialty: profile.years_experience_specialty ?? null,
        referral_source: profile.referral_source ?? "",
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[ONBOARDING_DETAILS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding details" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      },
    );
  }
}

/**
 * PUT /api/candidate/onboarding-details
 *
 * Saves the first-login onboarding form. Uses upsert so it works even if
 * the CandidateProfile doesn't exist. Also syncs first_name/last_name to
 * the User record.
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
    const middleName = body.middle_name ? String(body.middle_name).trim().slice(0, 100) : null;
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

    // ── Upsert profile ──
    await db.candidateProfile.upsert({
      where: { user_id: userId },
      update: {
        first_name: firstName,
        middle_name: middleName,
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
      create: {
        user_id: userId,
        first_name: firstName,
        middle_name: middleName,
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

    // ── Sync first_name/last_name to User record ──
    await db.user.update({
      where: { id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    return NextResponse.json(
      { success: true, onboarding_completed: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      },
    );
  } catch (error: any) {
    console.error("[ONBOARDING_DETAILS_PUT]", error);
    return NextResponse.json(
      { error: "Failed to save onboarding details" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      },
    );
  }
}
