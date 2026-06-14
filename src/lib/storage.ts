import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabase";
import { randomUUID } from "crypto";

const BUCKET_CREDENTIALS = "credentials";
const BUCKET_RESUMES = "resumes";
const BUCKET_BAA = "baa-documents";
const BUCKET_INVOICES = "invoice-pdfs";
const BUCKET_BANNERS = "banners";

/**
 * Upload a file to Supabase Storage.
 * Falls back to base64 data URL if Supabase is not configured.
 */
export async function uploadFile(
  bucket: string,
  folder: string,
  file: File | Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; isLocalStorage: boolean }> {
  // If Supabase is not configured, fall back to base64
  if (!isSupabaseAdminConfigured()) {
    console.warn("[STORAGE] Supabase not configured. Falling back to base64 storage in DB.");
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    const base64 = buffer.toString("base64");
    return {
      url: `data:${mimeType};base64,${base64}`,
      isLocalStorage: true,
    };
  }

  const supabase = getSupabaseAdmin();
  const fileExtension = originalName.split(".").pop() || "bin";
  const uniqueFileName = `${randomUUID()}.${fileExtension}`;
  const storagePath = `${folder}/${uniqueFileName}`;

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === bucket);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucket, { public: false });
  }

  // Upload the file
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[STORAGE] Upload failed:", uploadError);
    // Fallback to base64
    const base64 = buffer.toString("base64");
    return {
      url: `data:${mimeType};base64,${base64}`,
      isLocalStorage: true,
    };
  }

  // Get the public URL (even though bucket is not public, we store the path for signed URL generation)
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  return {
    url: fileUrl,
    isLocalStorage: false,
  };
}

/**
 * Generate a signed URL for private file access.
 * Returns the original URL if it's a base64 data URL.
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 900
): Promise<string> {
  // If it's a base64 data URL, return as-is
  if (filePath.startsWith("data:")) {
    return filePath;
  }

  if (!isSupabaseAdminConfigured()) {
    return filePath; // Return as-is if no Supabase
  }

  const supabase = getSupabaseAdmin();

  // Extract the path after the bucket name from the full URL
  // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const urlParts = filePath.split(`/${bucket}/`);
  const storagePath = urlParts.length > 1 ? urlParts[1] : filePath;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("[STORAGE] Signed URL failed:", error);
    return filePath;
  }

  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return true; // Can't delete from Supabase if not configured
  }

  if (filePath.startsWith("data:")) {
    return true; // Base64 data URLs don't need deletion
  }

  const supabase = getSupabaseAdmin();
  const urlParts = filePath.split(`/${bucket}/`);
  const storagePath = urlParts.length > 1 ? urlParts[1] : filePath;

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    console.error("[STORAGE] Delete failed:", error);
    return false;
  }

  return true;
}

// Bucket name constants
export const STORAGE_BUCKETS = {
  CREDENTIALS: BUCKET_CREDENTIALS,
  RESUMES: BUCKET_RESUMES,
  BAA: BUCKET_BAA,
  INVOICES: BUCKET_INVOICES,
  BANNERS: BUCKET_BANNERS,
} as const;
