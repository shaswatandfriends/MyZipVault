import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);

    const body = await request.json();
    const { otp } = body;

    if (!otp || typeof otp !== "string" || otp.length !== 6) {
      return NextResponse.json({ error: "A valid 6-digit code is required" }, { status: 400 });
    }

    // Retrieve stored OTP
    const otpRecord = await db.platformSetting.findUnique({
      where: { setting_key: "delete_ref_questions_otp" },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
    }

    let otpData: { otp: string; expires_at: string; attempts: number };
    try {
      otpData = JSON.parse(otpRecord.setting_value);
    } catch {
      return NextResponse.json({ error: "Invalid verification data. Please request a new code." }, { status: 400 });
    }

    // Check expiry
    const expiresAt = new Date(otpData.expires_at);
    if (new Date() > expiresAt) {
      await db.platformSetting.delete({ where: { setting_key: "delete_ref_questions_otp" } }).catch(() => {});
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      await db.platformSetting.delete({ where: { setting_key: "delete_ref_questions_otp" } }).catch(() => {});
      return NextResponse.json({ error: "Too many failed attempts. Please request a new code." }, { status: 400 });
    }

    // Verify OTP with bcrypt
    const isValid = await bcrypt.compare(otp, otpData.otp);

    if (!isValid) {
      // Increment attempts
      otpData.attempts += 1;
      await db.platformSetting.update({
        where: { setting_key: "delete_ref_questions_otp" },
        data: {
          setting_value: JSON.stringify(otpData),
        },
      });

      const remaining = 3 - otpData.attempts;
      if (remaining <= 0) {
        await db.platformSetting.delete({ where: { setting_key: "delete_ref_questions_otp" } }).catch(() => {});
        return NextResponse.json({ error: "Too many failed attempts. Please request a new code." }, { status: 400 });
      }

      return NextResponse.json({
        error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      }, { status: 400 });
    }

    // OTP verified — proceed with deletion
    // IMPORTANT: Must delete dependent records first to respect foreign key constraints:
    // 1. ReferenceResponse (references ReferenceQuestion via question_id)
    // 2. ReferenceDeletionRequest (references CandidateReference)
    // 3. CandidateReference (independent but related)
    // 4. ReferenceQuestion

    // Step 1: Delete all reference responses (references questions)
    await db.referenceResponse.deleteMany({});

    // Step 2: Delete all reference deletion requests
    await db.referenceDeletionRequest.deleteMany({});

    // Step 3: Delete all candidate references
    await db.candidateReference.deleteMany({});

    // Step 4: Delete all reference questions
    await db.referenceQuestion.deleteMany({});

    // Delete stored OTP
    await db.platformSetting.delete({ where: { setting_key: "delete_ref_questions_otp" } }).catch(() => {});

    // Create audit log
    await logAudit({
      userId,
      role: userRole,
      action: "deleted_all_reference_questions",
      entityType: "reference_question",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_ALL_REF_QUESTIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete reference questions" },
      { status: 500 }
    );
  }
}
