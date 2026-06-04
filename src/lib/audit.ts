import { db } from "@/lib/db";

interface AuditEvent {
  userId?: number;
  role?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  ipAddress?: string;
}

/**
 * Main audit logging function.
 * Persists an audit event to the AuditLog table.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  await db.auditLog.create({
    data: {
      user_id: event.userId ?? null,
      role: event.role ?? null,
      action: event.action,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      ip_address: event.ipAddress ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience helpers – each maps to a specific action string
// ---------------------------------------------------------------------------

/** Admin logged in as another user (proxy login). */
export async function logProxyLogin(
  adminId: number,
  adminRole: string,
  targetUserId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId: adminId,
    role: adminRole,
    action: "admin_proxy_login",
    entityType: "user",
    entityId: targetUserId,
    ipAddress: ip,
  });
}

/** Admin exited proxy mode. */
export async function logProxyExit(
  adminId: number,
  adminRole: string,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId: adminId,
    role: adminRole,
    action: "admin_proxy_exit",
    ipAddress: ip,
  });
}

/** Admin viewed a credential document. */
export async function logDocumentViewed(
  userId: number,
  role: string,
  docType: string,
  docId: number,
  ip?: string,
): Promise<void> {
  const action =
    docType === "credential"
      ? "admin_viewed_credential"
      : "admin_viewed_resume";

  await logAudit({
    userId,
    role,
    action,
    entityType: docType,
    entityId: docId,
    ipAddress: ip,
  });
}

/** Admin approved a document / credential. */
export async function logDocumentApproved(
  userId: number,
  role: string,
  credentialId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    role,
    action: "admin_approved_document",
    entityType: "credential",
    entityId: credentialId,
    ipAddress: ip,
  });
}

/** Admin rejected a document / credential. */
export async function logDocumentRejected(
  userId: number,
  role: string,
  credentialId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    role,
    action: "admin_rejected_document",
    entityType: "credential",
    entityId: credentialId,
    ipAddress: ip,
  });
}

/** Candidate shared their document. */
export async function logCandidateShared(
  userId: number,
  shareId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    role: "candidate",
    action: "candidate_shared_document",
    entityType: "share",
    entityId: shareId,
    ipAddress: ip,
  });
}

/** Recruiter unlocked a document. */
export async function logRecruiterUnlocked(
  userId: number,
  docType: string,
  docId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    role: "recruiter",
    action: "recruiter_unlocked_document",
    entityType: docType,
    entityId: docId,
    ipAddress: ip,
  });
}

/** Account was suspended. */
export async function logAccountSuspended(
  userId: number,
  targetUserId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "account_suspended",
    entityType: "user",
    entityId: targetUserId,
    ipAddress: ip,
  });
}

/** Account was restored. */
export async function logAccountRestored(
  userId: number,
  targetUserId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "account_restored",
    entityType: "user",
    entityId: targetUserId,
    ipAddress: ip,
  });
}

/** Account was permanently deleted (purged). */
export async function logAccountPurged(
  adminId: number,
  targetUserId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId: adminId,
    action: "account_permanently_deleted",
    entityType: "user",
    entityId: targetUserId,
    ipAddress: ip,
  });
}

/** BAA (Business Associate Agreement) was signed. */
export async function logBaaSigned(
  userId: number,
  orgId: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "baa_signed",
    entityType: "organization",
    entityId: orgId,
    ipAddress: ip,
  });
}

/** Credits were deducted from an organization. */
export async function logCreditsDeducted(
  userId: number,
  orgId: number,
  amount: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "credits_deducted",
    entityType: "organization",
    entityId: orgId,
    ipAddress: ip,
  });
}

/** Credits were purchased for an organization. */
export async function logCreditsPurchased(
  userId: number,
  orgId: number,
  amount: number,
  ip?: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "credits_purchased",
    entityType: "organization",
    entityId: orgId,
    ipAddress: ip,
  });
}
