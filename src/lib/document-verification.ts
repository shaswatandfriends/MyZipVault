import { db } from "@/lib/db";

interface StoreVerificationParams {
  documentId: string;
  verificationCode: string;
  documentType: "checklist" | "baa" | "invoice" | "reference" | "vaultsign";
  sourceId?: number;
  candidateName?: string;
  documentName?: string;
  signedAt?: Date;
  pdfHash?: string;
}

/**
 * Store a document verification record in the database.
 * Uses upsert so re-generating the same PDF won't create duplicates.
 */
export async function storeDocumentVerification(params: StoreVerificationParams) {
  try {
    await db.documentVerification.upsert({
      where: { document_id: params.documentId },
      update: {
        verification_code: params.verificationCode,
        document_type: params.documentType,
        source_id: params.sourceId,
        candidate_name: params.candidateName,
        document_name: params.documentName,
        signed_at: params.signedAt,
        pdf_hash: params.pdfHash,
        status: "active",
        updated_at: new Date(),
      },
      create: {
        document_id: params.documentId,
        verification_code: params.verificationCode,
        document_type: params.documentType,
        source_id: params.sourceId,
        candidate_name: params.candidateName,
        document_name: params.documentName,
        signed_at: params.signedAt,
        pdf_hash: params.pdfHash,
        status: "active",
      },
    });
  } catch (error) {
    console.error("[STORE_DOCUMENT_VERIFICATION]", error);
    // Don't throw — PDF generation should not fail if verification storage fails
  }
}

/**
 * Generate a deterministic verification code from input data.
 * This matches the algorithm used in pdf.ts.
 */
export function generateVerificationCode(input: string): string {
  return input
    .split("")
    .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .toUpperCase()
    .replace(/-/g, "0")
    .padStart(8, "0")
    .slice(0, 8);
}

/**
 * Generate a unique document ID.
 * This matches the algorithm used in pdf.ts.
 */
export function generateDocumentId(prefix: string = "MZV"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
