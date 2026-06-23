import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateChecklistPdf } from "@/lib/pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (
      ![
        "client_recruiter",
        "client_admin",
        "platform_admin",
        "super_admin",
      ].includes(userRole)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const checklistRequestId = Number(id);

    // Check query param for preview vs download
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "download"; // "download" or "preview"

    // Find the checklist request
    const checklistRequest = await (async () => {
      try {
        return await db.checklistRequest.findUnique({
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
          },
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

    if (!checklistRequest.candidate_response) {
      return NextResponse.json(
        { error: "No completed response found" },
        { status: 400 }
      );
    }

    const candidate = checklistRequest.candidate_user;
    const template = checklistRequest.checklist_template;
    const response = checklistRequest.candidate_response;

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

    // Generate PDF
    const pdfBuffer = await generateChecklistPdf({
      candidateName,
      checklistName: template.name,
      profession: template.profession,
      specialty: template.specialty,
      agencyName: "MyZipVault",
      recruiterName: `${(session.user as Record<string, unknown>).name || "Recruiter"}`,
      completedDate: response.submitted_at
        ? new Date(response.submitted_at).toLocaleDateString("en-US")
        : "N/A",
      validUntil: response.valid_until
        ? new Date(response.valid_until).toLocaleDateString("en-US")
        : "N/A",
      skills,
      attestationText:
        "I attest that the information provided in this checklist is accurate and reflects my true skill level.",
      signatureName: response.candidate_name_signed || candidateName,
      signatureDate: response.signature_date
        ? new Date(response.signature_date).toLocaleDateString("en-US")
        : "N/A",
      signatureBase64: response.digital_signature || undefined,
    });

    const fileName = `${(candidate.first_name || "candidate").replace(/\s+/g, "-")}-${(candidate.last_name || "").replace(/\s+/g, "-")}-checklist.pdf`;

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
    console.error("Checklist PDF GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
