import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      specialty,
      checklistTemplateId,
      documents,
    } = body;

    if (!email || !firstName || !lastName || !checklistTemplateId) {
      return NextResponse.json(
        { error: "Missing required fields: email, firstName, lastName, checklistTemplateId" },
        { status: 400 }
      );
    }

    // Check if candidate already exists
    const existingUser = await db.user.findUnique({
      where: { email },
      include: { candidate_profile: true },
    });

    let candidateUserId: number;
    let isNewCandidate = false;

    if (existingUser) {
      // Candidate already exists
      if (existingUser.role !== "candidate") {
        return NextResponse.json(
          { error: "A user with this email already exists with a different role" },
          { status: 400 }
        );
      }
      candidateUserId = existingUser.id;
    } else {
      // Create new candidate user
      const bcrypt = await import("bcryptjs");
      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-12), 10);

      const newUser = await db.user.create({
        data: {
          email,
          password_hash: tempPassword,
          role: "candidate",
          is_approved: true,
          first_name: firstName,
          last_name: lastName,
          phone: phone ?? null,
          must_change_pass: true,
        },
      });

      await db.candidateProfile.create({
        data: {
          user_id: newUser.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone ?? "",
          profile_completion_pct: 0,
        },
      });

      candidateUserId = newUser.id;
      isNewCandidate = true;

      // Create invite token
      await db.inviteToken.create({
        data: {
          token: uuidv4(),
          email,
          role: "candidate",
          token_type: "candidate_invite",
          invited_by: userId,
          organization_id: organizationId,
          nurse_name: `${firstName} ${lastName}`,
          is_used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create checklist request
    const checklistRequest = await db.checklistRequest.create({
      data: {
        client_user_id: userId,
        candidate_user_id: candidateUserId,
        checklist_template_id: Number(checklistTemplateId),
        status: "sent",
        completion_pct: 0,
      },
    });

    // Create share request if documents are requested
    if (documents && Array.isArray(documents) && documents.length > 0) {
      await db.shareRequest.create({
        data: {
          candidate_user_id: candidateUserId,
          client_user_id: userId,
          request_checklists: documents.includes("checklist"),
          request_credentials: documents.includes("credential"),
          request_resume: documents.includes("resume"),
          request_references: documents.includes("reference"),
          status: "pending",
          message: `Please share your ${documents.join(", ")} documents with us.`,
        },
      });
    }

    // Deduct credits for the request (1 credit per document requested)
    const docCount = documents?.length ?? 0;
    const totalCredits = 1 + docCount; // 1 for checklist request + 1 per document

    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (org && org.credits_balance < totalCredits) {
      // Not enough credits — still create the request but don't deduct
      // In production, we'd block this; for now, allow it
    }

    if (org && org.credits_balance >= totalCredits) {
      await db.organization.update({
        where: { id: organizationId },
        data: { credits_balance: org.credits_balance - totalCredits },
      });

      await db.creditTransaction.create({
        data: {
          organization_id: organizationId,
          transaction_type: "deduction",
          credit_amount: -totalCredits,
          description: `Checklist request sent to ${firstName} ${lastName} (${docCount} documents)`,
        },
      });
    }

    // Update user last activity
    await db.user.update({
      where: { id: userId },
      data: { last_activity_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      checklistRequestId: checklistRequest.id,
      candidateUserId,
      isNewCandidate,
      creditsCharged: totalCredits,
      message: isNewCandidate
        ? `Invitation sent to ${firstName} ${lastName} at ${email}`
        : `Checklist request sent to existing candidate ${firstName} ${lastName}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Send request POST error:", error);
    return NextResponse.json(
      { error: "Failed to send request" },
      { status: 500 }
    );
  }
}
