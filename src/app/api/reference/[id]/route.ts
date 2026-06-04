import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referenceId = Number(id);

    const reference = await db.candidateReference.findUnique({
      where: { id: referenceId },
      include: {
        candidate_user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        reference_responses: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!reference) {
      return NextResponse.json(
        { error: "Invalid reference link", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (reference.status === "completed") {
      return NextResponse.json({
        code: "ALREADY_COMPLETED",
        reference: {
          id: reference.id,
          candidateName: `${reference.candidate_user.first_name} ${reference.candidate_user.last_name}`,
          facilityName: reference.facility_name,
          employmentStatus: reference.employment_status,
          status: reference.status,
        },
      });
    }

    if (reference.status === "declined") {
      return NextResponse.json({
        code: "DECLINED",
        reference: {
          id: reference.id,
          candidateName: `${reference.candidate_user.first_name} ${reference.candidate_user.last_name}`,
          facilityName: reference.facility_name,
          employmentStatus: reference.employment_status,
          status: reference.status,
        },
      });
    }

    // Fetch questions for this employment status
    const questions = await db.referenceQuestion.findMany({
      where: { employment_status: reference.employment_status },
      orderBy: { sort_order: "asc" },
    });

    // Map existing responses
    const existingResponses: Record<number, string> = {};
    for (const resp of reference.reference_responses) {
      existingResponses[resp.question_id] = resp.answer_text;
    }

    return NextResponse.json({
      reference: {
        id: reference.id,
        candidateName: `${reference.candidate_user.first_name} ${reference.candidate_user.last_name}`,
        facilityName: reference.facility_name,
        employmentStatus: reference.employment_status,
        status: reference.status,
        managerEmail: reference.manager_email,
        managerPhone: reference.manager_phone,
      },
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        responseType: q.response_type,
        sortOrder: q.sort_order,
        existingAnswer: existingResponses[q.id] || null,
      })),
      existingResponses,
      overallComment: reference.reference_responses[0]?.overall_comment || null,
      digitalSignature: reference.reference_responses[0]?.digital_signature || null,
    });
  } catch (error) {
    console.error("Reference GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referenceId = Number(id);
    const body = await request.json();
    const { answers, overallComment, digitalSignature } = body;

    if (!digitalSignature || !digitalSignature.trim()) {
      return NextResponse.json(
        { error: "Digital signature is required" },
        { status: 400 }
      );
    }

    const reference = await db.candidateReference.findUnique({
      where: { id: referenceId },
    });

    if (!reference) {
      return NextResponse.json(
        { error: "Invalid reference link" },
        { status: 404 }
      );
    }

    if (reference.status === "completed") {
      return NextResponse.json(
        { error: "Reference already submitted" },
        { status: 400 }
      );
    }

    if (reference.status === "declined") {
      return NextResponse.json(
        { error: "Reference has been declined" },
        { status: 400 }
      );
    }

    // Create/update responses for each answer
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        await db.referenceResponse.upsert({
          where: {
            id: answer.existingId || -1,
          },
          update: {
            answer_text: answer.answerText,
            overall_comment: overallComment || null,
            digital_signature: digitalSignature.trim(),
            signature_date: new Date(),
            submitted_at: new Date(),
          },
          create: {
            candidate_reference_id: referenceId,
            question_id: answer.questionId,
            answer_text: answer.answerText,
            overall_comment: overallComment || null,
            digital_signature: digitalSignature.trim(),
            signature_date: new Date(),
            submitted_at: new Date(),
          },
        });
      }
    }

    // Update reference status
    await db.candidateReference.update({
      where: { id: referenceId },
      data: { status: "completed" },
    });

    // ─── Manager Gets Free Candidate Vault ─────────────────────────
    // After a manager completes a reference, if they don't already
    // have a candidate account, create one for them automatically.
    try {
      const managerUser = await db.user.findUnique({
        where: { email: reference.manager_email },
      });

      if (managerUser) {
        // Manager already has an account — just link it
        if (!reference.manager_user_id) {
          await db.candidateReference.update({
            where: { id: referenceId },
            data: { manager_user_id: managerUser.id },
          });
        }
      } else {
        // No existing account — create a free candidate vault
        const bcrypt = await import("bcryptjs");
        const tempPassword = await bcrypt.hash(
          Math.random().toString(36).slice(-12),
          12
        );

        const newManagerUser = await db.user.create({
          data: {
            email: reference.manager_email,
            password_hash: tempPassword,
            role: "candidate",
            is_approved: true,
            first_name: "",
            last_name: "",
            phone: reference.manager_phone || "",
            must_change_pass: true,
            account_status: "active",
          },
        });

        await db.candidateProfile.create({
          data: {
            user_id: newManagerUser.id,
            first_name: "",
            last_name: "",
            phone: reference.manager_phone || "",
            profile_completion_pct: 0,
          },
        });

        // Link the new user to the reference
        await db.candidateReference.update({
          where: { id: referenceId },
          data: { manager_user_id: newManagerUser.id },
        });

        // Create invite token so the manager can set their password
        const { v4: uuidv4 } = await import("uuid");
        const token = uuidv4();
        await db.inviteToken.create({
          data: {
            token,
            email: reference.manager_email,
            role: "candidate",
            token_type: "manager_vault",
            organization_id: null,
            is_used: false,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });

        // Send welcome email to the manager about their free vault
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || ""}/set-password?token=${token}`;
        await sendEmail({
          to: reference.manager_email,
          templateKey: "manager_vault_welcome",
          variables: {
            manager_email: reference.manager_email,
            invite_link: inviteLink,
            facility_name: reference.facility_name,
          },
          phone: reference.manager_phone || undefined,
        });
      }
    } catch (vaultError) {
      // Log but don't fail the reference submission
      console.error("Manager vault creation error (non-blocking):", vaultError);
    }

    return NextResponse.json({
      message: "Reference submitted successfully",
    });
  } catch (error) {
    console.error("Reference POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit reference" },
      { status: 500 }
    );
  }
}
