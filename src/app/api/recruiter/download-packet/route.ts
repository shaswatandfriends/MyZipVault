import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateChecklistPdf, generateReferencePdf } from "@/lib/pdf";
import { getSignedUrl, STORAGE_BUCKETS } from "@/lib/storage";
import { ZipArchive } from "archiver";
import { Readable } from "stream";

// ─── Auth & Role Check ────────────────────────────────────────────
async function requireRecruiter() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (!["client_admin", "client_recruiter"].includes(userRole)) return null;

  const userId = Number(session.user.id);
  const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
  if (!organizationId) return null;

  return { userId, organizationId, userRole };
}

// ─── Build checklist PDF data from DB ─────────────────────────────
async function buildChecklistPdfData(entityId: number) {
  const response = await db.candidateChecklistResponse.findUnique({
    where: { id: entityId },
    include: {
      checklist_template: { select: { name: true, specialty: true } },
      candidate_user: {
        select: { first_name: true, last_name: true },
      },
      skill_ratings: {
        include: {
          skill: { select: { skill_name: true, category: true, sort_order: true } },
        },
        orderBy: { skill: { sort_order: "asc" } },
      },
    },
  });

  if (!response) throw new Error("Checklist response not found");

  const candidateName = [response.candidate_user.first_name, response.candidate_user.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    candidateName,
    specialty: response.checklist_template.specialty,
    checklistName: response.checklist_template.name,
    completedDate: response.submitted_at
      ? new Date(response.submitted_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not completed",
    skills: response.skill_ratings.map((sr) => ({
      category: sr.skill.category,
      skillName: sr.skill.skill_name,
      rating: sr.rating_value ?? "",
      isNa: sr.is_na,
    })),
    attestationText:
      "I hereby attest that the skills self-assessment above accurately reflects my current competency level. " +
      "I understand that this information will be shared with healthcare facilities for credentialing purposes " +
      "and that any misrepresentation may result in disqualification.",
    signatureName: response.candidate_name_signed ?? candidateName,
    signatureDate: response.signature_date
      ? new Date(response.signature_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : response.submitted_at
        ? new Date(response.submitted_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
  };
}

// ─── Build reference PDF data from DB ─────────────────────────────
async function buildReferencePdfData(entityId: number) {
  const reference = await db.candidateReference.findUnique({
    where: { id: entityId },
    include: {
      candidate_user: { select: { first_name: true, last_name: true } },
      manager_user: { select: { first_name: true, last_name: true } },
      reference_responses: {
        include: {
          question: { select: { question_text: true, sort_order: true } },
        },
        orderBy: { question: { sort_order: "asc" } },
      },
    },
  });

  if (!reference) throw new Error("Reference not found");

  const nurseName = [reference.candidate_user.first_name, reference.candidate_user.last_name]
    .filter(Boolean)
    .join(" ");

  const managerName = reference.manager_user
    ? [reference.manager_user.first_name, reference.manager_user.last_name].filter(Boolean).join(" ")
    : reference.manager_email;

  // Get overall comment and signature from the first response that has them
  const firstResponseWithSignature = reference.reference_responses.find(
    (r) => r.digital_signature
  );
  const firstResponseWithComment = reference.reference_responses.find(
    (r) => r.overall_comment
  );

  return {
    nurseName,
    managerName: managerName ?? reference.manager_email,
    facility: reference.facility_name,
    employmentStatus: reference.employment_status,
    questions: reference.reference_responses.map((rr) => ({
      question: rr.question.question_text,
      answer: rr.answer_text,
    })),
    overallComment: firstResponseWithComment?.overall_comment ?? "",
    signatureName: firstResponseWithSignature?.digital_signature ?? managerName ?? "—",
    signatureDate: firstResponseWithSignature?.signature_date
      ? new Date(firstResponseWithSignature.signature_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : firstResponseWithSignature?.submitted_at
        ? new Date(firstResponseWithSignature.submitted_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
    attestationText:
      "I hereby attest that the information provided in this professional reference is truthful and accurate " +
      "to the best of my knowledge. I understand this reference will be used for healthcare credentialing purposes.",
  };
}

// ─── Individual Document Download ──────────────────────────────────
async function handleIndividualDownload(
  candidateId: number,
  docType: string,
  docId: number,
  userId: number
) {
  // Verify the recruiter has unlocked this document
  const unlockedDoc = await db.unlockedDocument.findFirst({
    where: {
      client_user_id: userId,
      entity_type: docType,
      entity_id: docId,
      consent_share: {
        candidate_user_id: candidateId,
      },
    },
    include: {
      consent_share: true,
    },
  });

  if (!unlockedDoc) {
    return NextResponse.json(
      { error: "Document not unlocked or access denied" },
      { status: 403 }
    );
  }

  switch (docType) {
    case "checklist": {
      const pdfData = await buildChecklistPdfData(docId);
      const pdfBuffer = await generateChecklistPdf(pdfData);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="checklist-${pdfData.candidateName.replace(/\s+/g, "-")}.pdf"`,
        },
      });
    }

    case "credential": {
      const credential = await db.credential.findUnique({
        where: { id: docId },
        select: { file_url: true, document_name: true },
      });
      if (!credential?.file_url) {
        return NextResponse.json({ error: "Credential file not found" }, { status: 404 });
      }
      const fileResult = await fetchFileAsBuffer(credential.file_url, STORAGE_BUCKETS.CREDENTIALS);
      if (!fileResult) {
        return NextResponse.json({ error: "Failed to fetch credential file" }, { status: 500 });
      }
      const credExt = getExtensionFromUrl(credential.file_url);
      const credMime = getMimeTypeFromExt(credExt);
      const credFilename = `${sanitizeFileName(credential.document_name || "credential")}.${credExt}`;
      return new NextResponse(fileResult.buffer, {
        status: 200,
        headers: {
          "Content-Type": credMime,
          "Content-Disposition": `attachment; filename="${credFilename}"`,
        },
      });
    }

    case "resume": {
      const resume = await db.resume.findUnique({
        where: { id: docId },
        select: { file_url: true },
      });
      if (!resume?.file_url) {
        return NextResponse.json({ error: "Resume file not found" }, { status: 404 });
      }
      const resumeResult = await fetchFileAsBuffer(resume.file_url, STORAGE_BUCKETS.RESUMES);
      if (!resumeResult) {
        return NextResponse.json({ error: "Failed to fetch resume file" }, { status: 500 });
      }
      const resumeExt = getExtensionFromUrl(resume.file_url);
      const resumeMime = getMimeTypeFromExt(resumeExt);
      const resumeFilename = `resume.${resumeExt}`;
      return new NextResponse(resumeResult.buffer, {
        status: 200,
        headers: {
          "Content-Type": resumeMime,
          "Content-Disposition": `attachment; filename="${resumeFilename}"`,
        },
      });
    }

    case "reference": {
      const pdfData = await buildReferencePdfData(docId);
      const pdfBuffer = await generateReferencePdf(pdfData);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="reference-${pdfData.nurseName.replace(/\s+/g, "-")}.pdf"`,
        },
      });
    }

    default:
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
}

// ─── ZIP Download All ─────────────────────────────────────────────
async function handleZipDownload(candidateId: number, userId: number) {
  // Get all unlocked documents for this candidate by this recruiter
  const unlockedDocs = await db.unlockedDocument.findMany({
    where: {
      client_user_id: userId,
      consent_share: {
        candidate_user_id: candidateId,
      },
    },
    include: {
      consent_share: {
        include: {
          checklist_response: {
            include: {
              checklist_template: { select: { name: true, specialty: true } },
            },
          },
          credential: { select: { id: true, document_name: true, file_url: true } },
          resume: { select: { id: true, file_url: true, is_builder_resume: true } },
          reference: { select: { id: true, facility_name: true } },
        },
      },
    },
  });

  if (unlockedDocs.length === 0) {
    return NextResponse.json(
      { error: "No unlocked documents to download" },
      { status: 404 }
    );
  }

  // Get candidate name for ZIP filename
  const candidate = await db.user.findUnique({
    where: { id: candidateId },
    select: { first_name: true, last_name: true },
  });
  const candidateName = candidate
    ? [candidate.first_name, candidate.last_name].filter(Boolean).join("-")
    : `candidate-${candidateId}`;

  // Create the ZIP archive
  const archive = new ZipArchive({ zlib: { level: 9 } });

  // Collect all PDF generation promises
  const fileEntries: Array<{ name: string; buffer: Buffer }> = [];

  for (const doc of unlockedDocs) {
    try {
      switch (doc.entity_type) {
        case "checklist": {
          const pdfData = await buildChecklistPdfData(doc.entity_id);
          const pdfBuffer = await generateChecklistPdf(pdfData);
          const checklistName = doc.consent_share.checklist_response?.checklist_template?.name ?? "Checklist";
          fileEntries.push({
            name: `Checklists/${sanitizeFileName(checklistName)}.pdf`,
            buffer: pdfBuffer,
          });
          break;
        }

        case "credential": {
          const credential = doc.consent_share.credential;
          if (credential?.file_url) {
            // For credentials stored in Supabase, we fetch the file content
            const signedUrl = await getSignedUrl(STORAGE_BUCKETS.CREDENTIALS, credential.file_url, 60);
            try {
              const fileRes = await fetch(signedUrl);
              if (fileRes.ok) {
                const arrayBuf = await fileRes.arrayBuffer();
                const ext = getExtensionFromUrl(credential.file_url);
                fileEntries.push({
                  name: `Credentials/${sanitizeFileName(credential.document_name)}.${ext}`,
                  buffer: Buffer.from(arrayBuf),
                });
              }
            } catch {
              // Skip file if can't fetch
              console.error(`Failed to fetch credential file: ${credential.document_name}`);
            }
          }
          break;
        }

        case "resume": {
          const resume = doc.consent_share.resume;
          if (resume?.file_url) {
            const signedUrl = await getSignedUrl(STORAGE_BUCKETS.RESUMES, resume.file_url, 60);
            try {
              const fileRes = await fetch(signedUrl);
              if (fileRes.ok) {
                const arrayBuf = await fileRes.arrayBuffer();
                const ext = getExtensionFromUrl(resume.file_url);
                const resumeLabel = resume.is_builder_resume ? "Builder-Resume" : "Uploaded-Resume";
                fileEntries.push({
                  name: `Resume/${sanitizeFileName(resumeLabel)}.${ext}`,
                  buffer: Buffer.from(arrayBuf),
                });
              }
            } catch {
              console.error("Failed to fetch resume file");
            }
          }
          break;
        }

        case "reference": {
          const pdfData = await buildReferencePdfData(doc.entity_id);
          const pdfBuffer = await generateReferencePdf(pdfData);
          const refName = doc.consent_share.reference?.facility_name ?? "Reference";
          fileEntries.push({
            name: `References/${sanitizeFileName(refName)}.pdf`,
            buffer: pdfBuffer,
          });
          break;
        }
      }
    } catch (err) {
      console.error(`Error processing document ${doc.entity_type}/${doc.entity_id}:`, err);
    }
  }

  if (fileEntries.length === 0) {
    return NextResponse.json(
      { error: "No downloadable files could be generated" },
      { status: 500 }
    );
  }

  // Add all entries to the archive
  for (const entry of fileEntries) {
    archive.append(entry.buffer, { name: entry.name });
  }

  // Finalize the archive
  archive.finalize();

  // Convert archive stream to buffer
  const zipBuffer = await streamToBuffer(archive);

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${candidateName}-documents.zip"`,
    },
  });
}

// ─── GET Handler ───────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const auth = await requireRecruiter();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, organizationId } = auth;
    const { searchParams } = new URL(request.url);

    const candidateIdParam = searchParams.get("candidateId");
    if (!candidateIdParam) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }
    const candidateId = Number(candidateIdParam);
    if (isNaN(candidateId)) {
      return NextResponse.json({ error: "Invalid candidateId" }, { status: 400 });
    }

    // Verify the recruiter's organization has access to this candidate
    const orgUsers = await db.user.findMany({
      where: { organization_id: organizationId, role: { in: ["client_recruiter", "client_admin"] } },
      select: { id: true },
    });
    const orgUserIds = orgUsers.map((u) => u.id);

    const checklistRequest = await db.checklistRequest.findFirst({
      where: { candidate_user_id: candidateId, client_user_id: { in: orgUserIds } },
    });

    if (!checklistRequest) {
      return NextResponse.json({ error: "No access to this candidate" }, { status: 403 });
    }

    const format = searchParams.get("format");
    const docType = searchParams.get("docType");
    const docIdParam = searchParams.get("docId");

    // ZIP download
    if (format === "zip") {
      return handleZipDownload(candidateId, userId);
    }

    // Individual document download
    if (docType && docIdParam) {
      const docId = Number(docIdParam);
      if (isNaN(docId)) {
        return NextResponse.json({ error: "Invalid docId" }, { status: 400 });
      }
      return handleIndividualDownload(candidateId, docType, docId, userId);
    }

    return NextResponse.json(
      { error: "Provide either format=zip or docType and docId parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Download packet GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate download packet" },
      { status: 500 }
    );
  }
}

// ─── Utilities ─────────────────────────────────────────────────────
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

function getExtensionFromUrl(url: string): string {
  if (url.startsWith("data:")) {
    // base64 data URL — extract mime type
    const mimeMatch = url.match(/data:([^;]+)/);
    if (mimeMatch) {
      const mime = mimeMatch[1];
      if (mime.includes("pdf")) return "pdf";
      if (mime.includes("png")) return "png";
      if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
      if (mime.includes("gif")) return "gif";
      if (mime.includes("webp")) return "webp";
    }
    return "bin";
  }
  const urlPath = url.split("?")[0];
  const ext = urlPath.split(".").pop()?.toLowerCase();
  if (ext && ext.length <= 5) return ext;
  return "bin";
}

function getMimeTypeFromExt(ext: string): string {
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bin: "application/octet-stream",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/**
 * Fetch a file as a Buffer, handling both Supabase signed URLs and base64 data URLs.
 * Returns null if the file cannot be fetched.
 */
async function fetchFileAsBuffer(
  fileUrl: string,
  bucket: string
): Promise<{ buffer: Buffer } | null> {
  // Handle base64 data URLs (used when Supabase is not configured)
  if (fileUrl.startsWith("data:")) {
    try {
      const base64Match = fileUrl.match(/base64,(.*)$/);
      if (base64Match) {
        return { buffer: Buffer.from(base64Match[1], "base64") };
      }
    } catch (err) {
      console.error("[download-packet] Failed to decode base64 data URL:", err);
      return null;
    }
  }

  // Handle Supabase storage URLs — get a signed URL and fetch the file
  try {
    const signedUrl = await getSignedUrl(bucket, fileUrl);
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) {
      console.error(`[download-packet] Failed to fetch file from signed URL: ${fileRes.status}`);
      return null;
    }
    const arrayBuf = await fileRes.arrayBuffer();
    return { buffer: Buffer.from(arrayBuf) };
  } catch (err) {
    console.error("[download-packet] Failed to fetch file:", err);
    return null;
  }
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err: Error) => reject(err));
  });
}
