import { z } from "zod";

/**
 * Shared Zod validation schemas for API endpoints.
 *
 * Usage in API routes:
 *   import { signupSchema } from "@/lib/validation-schemas";
 *
 *   const body = await request.json();
 *   const parsed = signupSchema.safeParse(body);
 *   if (!parsed.success) {
 *     return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
 *   }
 *   // Use parsed.data (type-safe, validated)
 */

// ─── Common reusable field validators ──────────────────────────────

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email is too long")
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password is too long (max 128 characters)")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const nameSchema = z
  .string()
  .min(1, "This field is required")
  .max(100, "This field is too long (max 100 characters)")
  .transform((v) => v.trim());

export const phoneSchema = z
  .string()
  .max(30, "Phone number is too long")
  .optional()
  .nullable()
  .transform((v) => v?.trim() || null);

export const uuidSchema = z
  .string()
  .uuid("Invalid ID format");

export const positiveIntSchema = z
  .number()
  .int("Must be a whole number")
  .positive("Must be a positive number");

// ─── Auth Schemas ──────────────────────────────────────────────────

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

export const agencySignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  companyName: nameSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  companyAddress: z.string().max(500).optional().nullable(),
  companyWebsite: z.string().max(200).optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

export const onboardSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
  tosAccepted: z.boolean().refine((v) => v === true, "You must accept the Terms & Conditions"),
});

export const otpVerifySchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// ─── Recruiter Schemas ─────────────────────────────────────────────

export const sendRequestSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  jobTitle: z.string().max(200).optional().nullable(),
  specialty: z.string().max(200).optional().nullable(),
  checklistTemplateId: positiveIntSchema,
  documents: z.array(z.string().max(50)).max(20, "Too many documents selected").optional(),
});

export const bundleCreateSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(255, "Name is too long").transform((v) => v.trim()),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  profession: z.string().max(100).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  checklistTemplateId: positiveIntSchema,
  documents: z.array(z.enum(["checklist", "credential", "resume", "reference"])).max(10).optional().default([]),
});

export const bundleUpdateSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(255).optional().transform((v) => v?.trim()),
  description: z.string().max(1000).optional().nullable(),
  profession: z.string().max(100).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  checklistTemplateId: positiveIntSchema.optional(),
  documents: z.array(z.enum(["checklist", "credential", "resume", "reference"])).max(10).optional(),
});

// ─── Candidate Schemas ─────────────────────────────────────────────

export const credentialUploadMetadataSchema = z.object({
  documentName: z.string().min(1, "Document name is required").max(255, "Document name is too long").transform((v) => v.trim()),
  expirationDate: z.string().optional().nullable(),
  reminderEnabled: z.boolean().optional().default(false),
});

export const shareApproveSchema = z.object({
  shareRequestId: positiveIntSchema,
  itemType: z.enum(["checklist", "credential", "resume", "reference"]),
  itemId: positiveIntSchema.optional(),
  expiryDays: z.number().int().min(1).max(90, "Expiry must be between 1 and 90 days"),
});

export const referenceRequestSchema = z.object({
  managerFirstName: nameSchema,
  managerLastName: nameSchema,
  managerEmail: emailSchema,
  managerPhone: phoneSchema,
  facilityName: nameSchema,
  employmentStatus: z.enum(["current", "ending_contract", "past"]),
});

// ─── Admin/SuperAdmin Schemas ──────────────────────────────────────

export const emailCampaignCreateSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(255).transform((v) => v.trim()),
  subject: z.string().min(1, "Subject is required").max(500).transform((v) => v.trim()),
  body: z.string().min(1, "Email body is required").max(100000, "Email body is too long"),
  targetRole: z.enum(["all", "candidate", "client_recruiter", "client_admin", "platform_admin", "super_admin"]),
  targetFilter: z.string().max(10000).optional().nullable(),
});

export const bundleLimitSchema = z.object({
  bundleLimit: z.number().int().min(0).max(1000, "Bundle limit is too high"),
});

export const platformSettingSchema = z.object({
  settingKey: z.string().min(1).max(255),
  settingValue: z.string().max(100000),
});

// ─── Validation Helper ─────────────────────────────────────────────

/**
 * Validate a request body against a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 *
 * Usage:
 *   const result = validateBody(signupSchema, body);
 *   if (!result.success) {
 *     return NextResponse.json({ error: result.error }, { status: 400 });
 *   }
 *   // Use result.data
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Return the first error message (most user-friendly)
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || "Validation failed" };
}
