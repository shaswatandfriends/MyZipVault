import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

/**
 * PUT /api/candidate/profile-fields
 *
 * Phase 4.2 — auto-save candidate-fillable profile fields from the
 * redesigned checklist list page header.
 *
 * Body: {
 *   city?: string,
 *   state?: string,        // 2-char US state code
 *   zip_code?: string,
 *   years_experience_total?: number,
 *   years_experience_specialty?: number,
 *   ssn?: string,          // PLAINTEXT — gets AES-256-encrypted before DB write
 * }
 *
 * SSN handling:
 *   - Plain SSN comes in via HTTPS body
 *   - This route encrypts it via src/lib/encryption.ts before writing
 *   - DB stores ONLY ssn_encrypted (ciphertext)
 *   - Never returns the SSN back in any response
 *
 * Response: { success: true, updated_fields: string[] }
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
    const updatedFields: string[] = [];

    // Build the update payload field-by-field (only fields explicitly provided)
    const updateData: Record<string, unknown> = {};

    if (body.city !== undefined) {
      updateData.city = String(body.city).trim() || null;
      updatedFields.push("city");
    }
    if (body.state !== undefined) {
      const state = String(body.state).trim().toUpperCase().slice(0, 2);
      updateData.state = state || null;
      updatedFields.push("state");
    }
    if (body.zip_code !== undefined) {
      updateData.zip_code = String(body.zip_code).trim().slice(0, 10) || null;
      updatedFields.push("zip_code");
    }
    if (body.years_experience_total !== undefined) {
      const total = parseInt(body.years_experience_total, 10);
      if (!isNaN(total) && total >= 0 && total <= 80) {
        updateData.years_experience_total = total;
        updatedFields.push("years_experience_total");
      }
    }
    if (body.years_experience_specialty !== undefined) {
      const specialty = parseInt(body.years_experience_specialty, 10);
      if (!isNaN(specialty) && specialty >= 0 && specialty <= 80) {
        updateData.years_experience_specialty = specialty;
        updatedFields.push("years_experience_specialty");
      }
    }
    if (body.ssn !== undefined && body.ssn !== null && String(body.ssn).trim() !== "") {
      try {
        const ssnPlain = String(body.ssn).replace(/[^0-9-]/g, "").slice(0, 11);
        if (ssnPlain) {
          updateData.ssn_encrypted = encrypt(ssnPlain);
          updatedFields.push("ssn_encrypted");
        }
      } catch (encErr) {
        console.error("[PROFILE_FIELDS] SSN encryption failed:", encErr);
        return NextResponse.json(
          { error: "SSN encryption failed — check ENCRYPTION_KEY env var" },
          { status: 500 }
        );
      }
    }

    if (updatedFields.length === 0) {
      return NextResponse.json({ success: true, updated_fields: [], message: "No fields to update" });
    }

    const existing = await db.candidateProfile.findUnique({ where: { user_id: userId } });
    if (existing) {
      await db.candidateProfile.update({
        where: { user_id: userId },
        data: updateData,
      });
    } else {
      return NextResponse.json(
        { error: "Candidate profile not found — please complete onboarding first" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_fields: updatedFields,
    });
  } catch (error: any) {
    console.error("[PROFILE_FIELDS_PUT]", error);
    return NextResponse.json({ error: "Failed to update profile fields" }, { status: 500 });
  }
}

/**
 * GET /api/candidate/profile-fields
 *
 * Returns the candidate's profile fields for pre-filling the checklist list
 * header. SSN is NOT returned (only a "has_ssn" boolean for UI display).
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
        city: true,
        state: true,
        zip_code: true,
        years_experience_total: true,
        years_experience_specialty: true,
        ssn_encrypted: true,
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
      profile: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: user?.email ?? "",
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
        years_experience_total: profile.years_experience_total,
        years_experience_specialty: profile.years_experience_specialty,
        has_ssn: !!profile.ssn_encrypted,
      },
    });
  } catch (error: any) {
    console.error("[PROFILE_FIELDS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
