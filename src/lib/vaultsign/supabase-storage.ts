import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase";
import { uploadFile, getSignedUrl as getStorageSignedUrl, deleteFile } from "@/lib/storage";
import { randomUUID } from "crypto";

const BUCKET_VAULTSIGN = "vaultsign-documents";

/**
 * Upload a document file to Supabase Storage.
 */
export async function uploadDocument(
  file: File | Buffer,
  folder: string,
  originalName: string,
  mimeType: string
): Promise<{ url: string; isLocalStorage: boolean }> {
  return uploadFile(BUCKET_VAULTSIGN, folder, file, originalName, mimeType);
}

/**
 * Get a signed URL for a VaultSign document.
 * Falls back to returning the URL as-is if it's a data URL or Supabase is not configured.
 */
export async function getDocumentSignedUrl(
  filePath: string,
  expiryMinutes: number = 15
): Promise<string> {
  return getStorageSignedUrl(BUCKET_VAULTSIGN, filePath, expiryMinutes * 60);
}

/**
 * Delete a document from Supabase Storage.
 */
export async function deleteDocument(filePath: string): Promise<boolean> {
  return deleteFile(BUCKET_VAULTSIGN, filePath);
}

/**
 * Upload a generated PDF buffer to VaultSign storage.
 */
export async function uploadGeneratedPdf(
  pdfBuffer: Buffer,
  folder: string,
  fileName: string
): Promise<{ url: string; isLocalStorage: boolean }> {
  return uploadFile(
    BUCKET_VAULTSIGN,
    folder,
    pdfBuffer,
    fileName,
    "application/pdf"
  );
}

/**
 * Generate a unique file path for VaultSign documents.
 */
export function generateFilePath(
  organizationId: number,
  documentId: number,
  type: "original" | "edited" | "final",
  extension: string
): string {
  return `org-${organizationId}/doc-${documentId}/${type}-${randomUUID()}.${extension}`;
}

export { BUCKET_VAULTSIGN };
