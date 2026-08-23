import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { requireEmailVerified } from "@/lib/email-verification";
import { referenceRequestSchema, validateBody } from "@/lib/validation-schemas";

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

    // Require email verification (Gap 5)
    const verificationCheck = await requireEmailVerified(userId);
    if (!verificationCheck.allowed) return verificationCheck.errorResponse!;

    const body = await request.json();

    // ─── Zod validation ───
    const validation = validateBody(referenceRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { managerFirstName, managerLastName, managerJobTitle, managerEmail, managerPhone, facilityName, candidateJobTitle, employmentStatus } = validation.data;

    const reference = await db.candidateReference.create({
      data: {
        candidate_user_id: userId,
        manager_first_name: managerFirstName,
        manager_last_name: managerLastName,
        manager_job_title: managerJobTitle || null,
        candidate_job_title: candidateJobTitle || null,
        manager_email: managerEmail,
        manager_phone: managerPhone || "",
        facility_name: facilityName,
        employment_status: employmentStatus,
        status: "pending_request",
      },
    });

    // Create notification
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId,
      category: "compliance",
      priority: "important",
      title: "Reference request sent",
      message: `Reference request sent to ${managerFirstName} ${managerLastName} at ${facilityName}`,
      relatedEntityId: reference.id,
      relatedEntityType: "reference",
    });

    // Send email notification to manager (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
    const referenceFormLink = `${appUrl}/reference/${reference.id}`;
    const candidateFirstName = (session.user as Record<string, unknown>).firstName as string || "";
    const candidateLastName = (session.user as Record<string, unknown>).lastName as string || "";
    const candidateName = `${candidateFirstName} ${candidateLastName}`.trim() || "A candidate";

    sendEmail({
      to: managerEmail,
      templateKey: "reference_request",
      variables: {
        manager_name: managerFirstName,
        candidate_name: candidateName,
        facility_name: facilityName,
        reference_form_link: referenceFormLink,
      },
      phone: managerPhone || undefined,
    }).catch((err) => {
      console.error("[EMAIL] Failed to send reference request email:", err);
    });

    return NextResponse.json(
      { message: "Reference request sent successfully", reference },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reference request error:", error);
    return NextResponse.json(
      { error: "Failed to send reference request" },
      { status: 500 }
    );
  }
}
