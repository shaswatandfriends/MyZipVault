import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
