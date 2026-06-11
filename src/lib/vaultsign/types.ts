/**
 * VaultSign shared types used across API routes and frontend.
 */

// ─── Sign Field Types ────────────────────────────────────────────────
export type SignFieldType = "signature" | "date" | "full_name" | "initials" | "email" | "text" | "checkbox";

export interface SignField {
  id: string;
  type: SignFieldType;
  page: number; // 1-based
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  assigned_to_signer_index: number; // 0-based
  label: string;
  required: boolean;
  value: string | null;
}

// ─── Document Status ─────────────────────────────────────────────────
export type DocumentStatus = "draft" | "sent" | "partially_signed" | "completed" | "declined" | "expired" | "voided";

// ─── Signer Status ───────────────────────────────────────────────────
export type SignerStatus = "pending" | "sent" | "viewed" | "signed" | "declined";

// ─── Signer Role ─────────────────────────────────────────────────────
export type SignerRole = "Candidate" | "Recruiter" | "Client Employer" | "Witness" | "Other";

// ─── Document Type ───────────────────────────────────────────────────
export type DocumentType = "right_to_represent" | "pre_offer_acceptance" | "offer_letter" | "nda" | "background_check_authorization" | "employment_contract" | "onboarding_form" | "custom";

// ─── Source Type ─────────────────────────────────────────────────────
export type SourceType = "word" | "pdf";

// ─── Signing Order ───────────────────────────────────────────────────
export type SigningOrder = "sequential" | "parallel";

// ─── Placeholder Variable ────────────────────────────────────────────
export interface PlaceholderVariable {
  key: string;
  label: string;
  description?: string;
  category?: "system" | "custom";
}

// ─── Signature Data ──────────────────────────────────────────────────
export interface SignatureData {
  type: "drawn" | "typed" | "uploaded";
  font?: string; // Dancing Script, Great Vibes, Pacifico, Sacramento
  text?: string;
  image_base64?: string;
}

// ─── Signer Signature Storage ────────────────────────────────────────
export interface SignerSignatureStore {
  primary?: SignatureData;
  per_field?: Record<string, SignatureData>;
}

// ─── Audit Trail Entry ──────────────────────────────────────────────
export interface AuditTrailEntry {
  event: string;
  user_name: string;
  ip_address?: string;
  device_info?: string;
  timestamp: string;
}

// ─── Header Config ───────────────────────────────────────────────────
export interface HeaderConfig {
  show_logo?: boolean;
  show_company_name?: boolean;
  show_contact?: boolean;
  show_address?: boolean;
  show_document_title?: boolean;
  logo_url?: string;
}

// ─── Footer Config ───────────────────────────────────────────────────
export interface FooterConfig {
  show_rights_reserved?: boolean;
  show_powered_by?: boolean;
  show_page_numbers?: boolean;
}

// ─── API Response Types ──────────────────────────────────────────────
export interface VaultSignDocumentResponse {
  id: number;
  organization_id: number;
  created_by_user_id: number;
  template_id: number | null;
  document_name: string;
  document_type: DocumentType;
  source_type: SourceType;
  original_file_url: string | null;
  tiptap_content: string | null;
  edited_pdf_url: string | null;
  final_document_url: string | null;
  signing_order: SigningOrder;
  expiry_date: string;
  personal_message: string | null;
  status: DocumentStatus;
  placeholder_values: Record<string, string>;
  sign_fields: SignField[];
  audit_trail: AuditTrailEntry[];
  document_hash: string | null;
  revised_from_document_id: number | null;
  created_at: string;
  updated_at: string;
  signers: VaultSignSignerResponse[];
  template?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface VaultSignSignerResponse {
  id: number;
  document_id: number;
  user_id: number | null;
  name: string;
  email: string;
  role: string;
  signer_index: number;
  signing_order_position: number;
  status: SignerStatus;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  sign_token: string;
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
}

// ─── System Variables ────────────────────────────────────────────────
export const SYSTEM_VARIABLES: PlaceholderVariable[] = [
  { key: "candidate_name", label: "Candidate Name", description: "Full name of the candidate", category: "system" },
  { key: "recruiter_name", label: "Recruiter Name", description: "Full name of the recruiter", category: "system" },
  { key: "company_name", label: "Company Name", description: "Organization/company name", category: "system" },
  { key: "current_date", label: "Current Date", description: "Today's date", category: "system" },
  { key: "current_year", label: "Current Year", description: "Current year (4 digits)", category: "system" },
  { key: "position_title", label: "Position Title", description: "Job position title", category: "system" },
  { key: "start_date", label: "Start Date", description: "Employment start date", category: "system" },
  { key: "salary", label: "Salary", description: "Offered salary amount", category: "system" },
  { key: "company_address", label: "Company Address", description: "Organization address", category: "system" },
  { key: "company_phone", label: "Company Phone", description: "Organization phone", category: "system" },
  { key: "company_email", label: "Company Email", description: "Organization email", category: "system" },
  { key: "company_website", label: "Company Website", description: "Organization website", category: "system" },
];

// ─── Signer Colors ───────────────────────────────────────────────────
export const SIGNER_COLORS = [
  "#166534", // green
  "#0D9488", // teal
  "#7C3AED", // purple
  "#DC2626", // red
  "#D97706", // amber
  "#2563EB", // blue
  "#DB2777", // pink
  "#059669", // emerald
];

export function getSignerColor(index: number): string {
  return SIGNER_COLORS[index % SIGNER_COLORS.length];
}

// ─── Field Type Labels ───────────────────────────────────────────────
export const FIELD_TYPE_LABELS: Record<SignFieldType, string> = {
  signature: "Signature",
  date: "Date",
  full_name: "Full Name",
  initials: "Initials",
  email: "Email",
  text: "Text",
  checkbox: "Checkbox",
};

export const FIELD_TYPE_ICONS: Record<SignFieldType, string> = {
  signature: "✍️",
  date: "📅",
  full_name: "👤",
  initials: "🔤",
  email: "📧",
  text: "📝",
  checkbox: "☑️",
};
