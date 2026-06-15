import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateChecklistPdf } from "@/lib/pdf";
import { storeDocumentVerification, generateVerificationCode, generateDocumentId } from "@/lib/document-verification";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const checklistRequestId = Number(id);

    // Check query param for preview vs download
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "download"; // "download" or "preview"

    // Find the checklist request
    const checklistRequest = await db.checklistRequest.findUnique({
      where: { id: checklistRequestId },
      include: {
        candidate_user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        checklist_template: {
          select: { name: true, profession: true, specialty: true },
        },
        candidate_response: {
          include: {
            skill_ratings: {
              include: {
                skill: {
                  select: {
                    skill_name: true,
                    category: true,
                    question_type: true,
                    sort_order: true,
                  },
                },
              },
            },
          },
        },
        client_user: {
          select: {
            first_name: true,
            last_name: true,
            organization: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (checklistRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!checklistRequest.candidate_response) {
      return NextResponse.json(
        { error: "No completed response found" },
        { status: 400 }
      );
    }

    if (checklistRequest.candidate_response.status !== "submitted") {
      return NextResponse.json(
        { error: "Checklist has not been submitted yet" },
        { status: 400 }
      );
    }

    const candidate = checklistRequest.candidate_user;
    const template = checklistRequest.checklist_template;
    const response = checklistRequest.candidate_response;
    const client = checklistRequest.client_user;

    // Build skills data for PDF
    const skills = response.skill_ratings
      .sort((a, b) => a.skill.sort_order - b.skill.sort_order)
      .map((sr) => ({
        skillName: sr.skill.skill_name,
        category: sr.skill.category,
        rating: sr.rating_value || "",
        isNa: sr.is_na,
      }));

    const candidateName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
    const agencyName = client.organization?.name || "MyZipVault";
    const recruiterName = `${client.first_name || ""} ${client.last_name || ""}`.trim();

    // Generate PDF
    const pdfBuffer = await generateChecklistPdf({
      candidateName,
      checklistName: template.name,
      profession: template.profession,
      specialty: template.specialty,
      agencyName,
      recruiterName,
      completedDate: response.submitted_at
        ? new Date(response.submitted_at).toLocaleDateString("en-US")
        : "N/A",
      validUntil: response.valid_until
        ? new Date(response.valid_until).toLocaleDateString("en-US")
        : "N/A",
      skills,
      attestationText:
        "I hereby certify that the skills self-assessment provided above is true and accurate to the best of my knowledge. I understand that this information will be shared with requesting healthcare agencies for employment verification purposes and may be subject to verification. I authorize the release of this checklist information to authorized personnel.",
      signatureName: response.candidate_name_signed || candidateName,
      signatureDate: response.signature_date
        ? new Date(response.signature_date).toLocaleDateString("en-US")
        : "N/A",
      signatureBase64: response.digital_signature || undefined,
    });

    const fileName = `${(candidate.first_name || "candidate").replace(/\s+/g, "-")}-${(candidate.last_name || "").replace(/\s+/g, "-")}-checklist.pdf`;

    // Store verification record so the document can be verified publicly
    const signatureDate = response.signature_date
      ? new Date(response.signature_date).toLocaleDateString("en-US")
      : "N/A";
    const verInput = `${candidateName}-${template.name}-${signatureDate}`;
    const docId = generateDocumentId("MZV");
    const verCode = generateVerificationCode(verInput);

    await storeDocumentVerification({
      documentId: docId,
      verificationCode: verCode,
      documentType: "checklist",
      sourceId: response.id,
      candidateName,
      documentName: `${template.name} - ${candidateName}`,
      signedAt: response.signature_date ? new Date(response.signature_date) : undefined,
    });

    const disposition =
      mode === "preview"
        ? `inline; filename="${fileName}"`
        : `attachment; filename="${fileName}"`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    console.error("Candidate checklist PDF GET error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", message);
    return NextResponse.json(
      { error: "Failed to generate PDF", detail: message },
      { status: 500 }
    );
  }
}
