// ─── Role Types ─────────────────────────────────────────────────────
export type UserRole =
  | "super_admin"
  | "platform_admin"
  | "client_admin"
  | "client_recruiter"
  | "candidate";

// ─── User ───────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  role: UserRole;
  organizationId: number | null;
  isApproved: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  accountStatus: string;
  mustChangePass: boolean;
  createdAt: Date;
}

// ─── Auth Session User ──────────────────────────────────────────────
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  organizationId: number | null;
  isApproved: boolean;
  firstName: string | null;
  lastName: string | null;
}

// ─── Organization ───────────────────────────────────────────────────
export interface Organization {
  id: number;
  name: string;
  creditsBalance: number;
  baaStatus: string;
  baaDocumentUrl: string | null;
  seatLimit: number;
  customPricingNotes: string | null;
  createdAt: Date;
}

// ─── Credential ─────────────────────────────────────────────────────
export interface Credential {
  id: number;
  candidateUserId: number;
  documentName: string;
  fileUrl: string;
  expirationDate: Date | null;
  reminderEnabled: boolean;
  status: string;
  verificationStatus: string;
  reviewedBy: number | null;
  reviewNotes: string | null;
  uploadedAt: Date;
}

// ─── Checklist Template ─────────────────────────────────────────────
export interface ChecklistTemplate {
  id: number;
  profession: string;
  specialty: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

// ─── Skill ──────────────────────────────────────────────────────────
export interface Skill {
  id: number;
  checklistTemplateId: number;
  skillName: string;
  category: string;
  questionType: string;
  sortOrder: number;
  hasNaOption: boolean;
}

// ─── Checklist Request ──────────────────────────────────────────────
export interface ChecklistRequest {
  id: number;
  clientUserId: number;
  candidateUserId: number;
  checklistTemplateId: number;
  status: string;
  completionPct: number;
  candidateResponseId: number | null;
  createdAt: Date;
}

// ─── Candidate Checklist Response ───────────────────────────────────
export interface CandidateChecklistResponse {
  id: number;
  candidateUserId: number;
  checklistTemplateId: number;
  status: string;
  validUntil: Date;
  submittedAt: Date | null;
  digitalSignature: string | null;
  candidateNameSigned: string | null;
  signatureDate: Date | null;
}

// ─── Skill Rating ───────────────────────────────────────────────────
export interface SkillRating {
  id: number;
  checklistResponseId: number;
  skillId: number;
  ratingValue: string | null;
  isNa: boolean;
  updatedAt: Date;
}

// ─── Resume ─────────────────────────────────────────────────────────
export interface Resume {
  id: number;
  candidateUserId: number;
  fileUrl: string | null;
  parsedData: string | null;
  isBuilderResume: boolean;
  createdAt: Date;
}

// ─── Candidate Profile ──────────────────────────────────────────────
export interface CandidateProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  resumeId: number | null;
  profileCompletionPct: number;
}

// ─── Candidate Reference ────────────────────────────────────────────
export interface CandidateReference {
  id: number;
  candidateUserId: number;
  managerUserId: number | null;
  managerEmail: string;
  managerPhone: string;
  facilityName: string;
  employmentStatus: string;
  status: string;
  requestedAt: Date;
}

// ─── Reference Question ─────────────────────────────────────────────
export interface ReferenceQuestion {
  id: number;
  employmentStatus: string;
  questionText: string;
  responseType: string;
  sortOrder: number;
}

// ─── Reference Response ─────────────────────────────────────────────
export interface ReferenceResponse {
  id: number;
  candidateReferenceId: number;
  questionId: number;
  answerText: string;
  overallComment: string | null;
  digitalSignature: string | null;
  signatureDate: Date | null;
  submittedAt: Date | null;
}

// ─── Consent Share ──────────────────────────────────────────────────
export interface ConsentShare {
  id: number;
  candidateUserId: number;
  clientUserId: number;
  checklistResponseId: number | null;
  credentialId: number | null;
  resumeId: number | null;
  referenceId: number | null;
  isDeleted: boolean;
  sharedAt: Date;
  expiresAt: Date;
}

// ─── Unlocked Document ──────────────────────────────────────────────
export interface UnlockedDocument {
  id: number;
  clientUserId: number;
  consentShareId: number;
  entityType: string;
  entityId: number;
  creditsCharged: number;
  unlockedAt: Date;
}

// ─── Credit Transaction ─────────────────────────────────────────────
export interface CreditTransaction {
  id: number;
  organizationId: number;
  transactionType: string;
  creditAmount: number;
  description: string;
  createdAt: Date;
}

// ─── Invoice ────────────────────────────────────────────────────────
export interface Invoice {
  id: number;
  organizationId: number;
  creditAmount: number;
  totalPrice: number;
  pdfUrl: string | null;
  createdAt: Date;
}

// ─── Notification ───────────────────────────────────────────────────
export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;
  relatedEntityId: number | null;
  createdAt: Date;
}

// ─── Pending Reminder ──────────────────────────────────────────────
export interface PendingReminder {
  id: number;
  ruleId: number;
  targetUserId: number;
  messagePreview: string;
  status: string;
  createdAt: Date;
  actionedBy: number | null;
  actionedAt: Date | null;
}

// ─── Platform Setting ──────────────────────────────────────────────
export interface PlatformSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  updatedBy: number | null;
  updatedAt: Date;
}

// ─── Feature Flag ──────────────────────────────────────────────────
export interface FeatureFlag {
  id: number;
  flagName: string;
  isEnabled: boolean;
  updatedBy: number | null;
  updatedAt: Date;
}

// ─── Email Template ────────────────────────────────────────────────
export interface EmailTemplate {
  id: number;
  templateKey: string;
  subject: string;
  body: string;
  updatedBy: number | null;
  updatedAt: Date;
}

// ─── Announcement ──────────────────────────────────────────────────
export interface Announcement {
  id: number;
  message: string;
  targetRole: string;
  isActive: boolean;
  createdAt: Date;
}

// ─── Document Flag ─────────────────────────────────────────────────
export interface DocumentFlag {
  id: number;
  credentialId: number;
  flagReason: string;
  status: string;
  reviewedBy: number | null;
  createdAt: Date;
}

// ─── System Error Log ──────────────────────────────────────────────
export interface SystemErrorLog {
  id: number;
  severity: string;
  service: string;
  errorMessage: string;
  createdAt: Date;
}

// ─── Audit Log ─────────────────────────────────────────────────────
export interface AuditLog {
  id: number;
  userId: number | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: Date;
}

// ─── Automated Rule ────────────────────────────────────────────────
export interface AutomatedRule {
  id: number;
  ruleName: string;
  triggerCondition: string;
  actionType: string;
  templateId: number | null;
  isActive: boolean;
}

// ─── Admin Permission ──────────────────────────────────────────────
export interface AdminPermission {
  id: number;
  userId: number;
  permissionName: string;
  isAllowed: boolean;
}

// ─── Sidebar Navigation Item ───────────────────────────────────────
export interface SidebarNavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
}
