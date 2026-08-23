import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      requestId,
      checklistRequestId,
      dateOfBirth,
      ssnLastFour,
      ssnLast4,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
    } = body;

    const effectiveRequestId = requestId || checklistRequestId;
    if (!effectiveRequestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    // Find the checklist request and verify ownership
    const checklistRequest = await (async () => {
      try {
        return await db.checklistRequest.findUnique({
          where: { id: Number(effectiveRequestId) },
          include: { candidate_response: true },
        });
      } catch (e) {
        console.error("[SCHEMA_DRIFT] query failed:", e);
        return null;
      }
    })();

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist request not found" },
        { status: 404 }
      );
    }

    if (checklistRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Encrypt PII fields with AES-256
    const encryptedDob = dateOfBirth ? encrypt(dateOfBirth) : undefined;
    const encryptedSsn = (ssnLastFour || ssnLast4) ? encrypt(ssnLastFour || ssnLast4) : undefined;

    // Update candidate profile with encrypted PII and address fields
    const profileUpdateData: Record<string, unknown> = {};
    if (encryptedDob !== undefined) profileUpdateData.date_of_birth = encryptedDob;
    if (encryptedSsn !== undefined) profileUpdateData.ssn_last_four = encryptedSsn;
    if (phone !== undefined) profileUpdateData.phone = phone;
    if (addressLine1 !== undefined) profileUpdateData.address_line1 = addressLine1;
    if (addressLine2 !== undefined) profileUpdateData.address_line2 = addressLine2;
    if (city !== undefined) profileUpdateData.city = city;
    if (state !== undefined) profileUpdateData.state = state;
    if (zipCode !== undefined) profileUpdateData.zip_code = zipCode;

    if (Object.keys(profileUpdateData).length > 0) {
      await db.candidateProfile.update({
        where: { user_id: userId },
        data: profileUpdateData,
      });
    }

    // Update candidate_checklist_response: set personal_info_collected = true
    if (checklistRequest.candidate_response) {
      await db.candidateChecklistResponse.update({
        where: { id: checklistRequest.candidate_response.id },
        data: { personal_info_collected: true },
      });
    } else {
      // If no response exists yet, create one with personal_info_collected = true
      const templateId = checklistRequest.checklist_template_id;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 90); // 90-day default validity

      const newResponse = await db.candidateChecklistResponse.create({
        data: {
          candidate_user_id: userId,
          checklist_template_id: templateId,
          status: "active",
          valid_until: validUntil,
          personal_info_collected: true,
        },
      });

      // Link the response to the request
      await db.checklistRequest.update({
        where: { id: checklistRequest.id },
        data: { candidate_response_id: newResponse.id },
      });
    }

    // Audit log
    await logAudit({
      userId,
      role: "candidate",
      action: "personal_info_saved",
      entityType: "checklist_request",
      entityId: checklistRequest.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save personal info error:", error);
    return NextResponse.json(
      { error: "Failed to save personal info" },
      { status: 500 }
    );
  }
}
