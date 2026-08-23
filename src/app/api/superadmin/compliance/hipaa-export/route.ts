import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedUrl, STORAGE_BUCKETS } from "@/lib/storage";
import { ZipArchive } from "archiver";
import { Readable } from "stream";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    if (!userIdParam) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // ── Fetch all data for the user ──────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        candidate_profile: true,
        credentials: true,
        resumes: true,
        candidate_checklist_responses: {
          include: {
            checklist_template: true,
            skill_ratings: {
              include: { skill: true },
            },
          },
        },
        candidate_references: {
          include: {
            reference_responses: {
              include: { question: true },
            },
          },
        },
        consent_shares_as_candidate: {
          include: {
            client_user: { select: { id: true, email: true, first_name: true, last_name: true } },
          },
        },
        notifications: { orderBy: { created_at: "desc" } },
        audit_logs: { orderBy: { created_at: "desc" } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Generate signed URLs for credentials ─────────────────────────
    const credentialsWithSignedUrls = await Promise.all(
      user.credentials.map(async (cred) => {
        let signedFileUrl = cred.file_url;
        try {
          if (cred.file_url && !cred.file_url.startsWith("data:")) {
            signedFileUrl = await getSignedUrl(STORAGE_BUCKETS.CREDENTIALS, cred.file_url, 3600);
          }
        } catch {
          // Keep original URL on failure
        }
        return {
          id: cred.id,
          document_name: cred.document_name,
          file_url: cred.file_url,
          signed_file_url: signedFileUrl,
          expiration_date: cred.expiration_date,
          status: cred.status,
          verification_status: cred.verification_status,
          review_notes: cred.review_notes,
          uploaded_at: cred.uploaded_at,
        };
      })
    );

    // ── Generate signed URLs for resumes ─────────────────────────────
    const resumesWithSignedUrls = await Promise.all(
      user.resumes.map(async (res) => {
        let signedFileUrl = res.file_url;
        try {
          if (res.file_url && !res.file_url.startsWith("data:")) {
            signedFileUrl = await getSignedUrl(STORAGE_BUCKETS.RESUMES, res.file_url, 3600);
          }
        } catch {
          // Keep original URL on failure
        }
        return {
          id: res.id,
          file_url: res.file_url,
          signed_file_url: signedFileUrl,
          parsed_data: res.parsed_data ? ((): { parseError: string } | Record<string, unknown> => {
            try { return JSON.parse(res.parsed_data) as Record<string, unknown>; } catch { return { parseError: "Invalid JSON" }; }
          })() : null,
          is_builder_resume: res.is_builder_resume,
          created_at: res.created_at,
        };
      })
    );

    // ── Build JSON data for ZIP ──────────────────────────────────────

    // profile.json - User + CandidateProfile
    const profileData = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        account_status: user.account_status,
        tos_accepted_at: user.tos_accepted_at,
        created_at: user.created_at,
        last_activity_at: user.last_activity_at,
      },
      candidate_profile: user.candidate_profile
        ? {
            id: user.candidate_profile.id,
            first_name: user.candidate_profile.first_name,
            last_name: user.candidate_profile.last_name,
            phone: user.candidate_profile.phone,
            profile_completion_pct: user.candidate_profile.profile_completion_pct,
            resume_id: user.candidate_profile.resume_id,
          }
        : null,
    };

    // credentials/ - Credential metadata + signed file URLs
    const credentialsData = {
      credentials: credentialsWithSignedUrls,
      total_count: credentialsWithSignedUrls.length,
    };

    // checklists/ - Checklist responses with ratings
    const checklistsData = {
      checklists: user.candidate_checklist_responses.map((cr) => ({
        id: cr.id,
        template_name: cr.checklist_template.name,
        template_profession: cr.checklist_template.profession,
        template_specialty: cr.checklist_template.specialty,
        status: cr.status,
        valid_until: cr.valid_until,
        submitted_at: cr.submitted_at,
        digital_signature: cr.digital_signature,
        candidate_name_signed: cr.candidate_name_signed,
        signature_date: cr.signature_date,
        skill_ratings: cr.skill_ratings.map((sr) => ({
          id: sr.id,
          skill_name: sr.skill.skill_name,
          category: sr.skill.category,
          question_type: sr.skill.question_type,
          rating_value: sr.rating_value,
          is_na: sr.is_na,
          updated_at: sr.updated_at,
        })),
      })),
      total_count: user.candidate_checklist_responses.length,
    };

    // references/ - Reference data
    const referencesData = {
      references: user.candidate_references.map((ref) => ({
        id: ref.id,
        manager_email: ref.manager_email,
        manager_phone: ref.manager_phone,
        facility_name: ref.facility_name,
        employment_status: ref.employment_status,
        status: ref.status,
        requested_at: ref.requested_at,
        responses: ref.reference_responses.map((rr) => ({
          id: rr.id,
          question_text: rr.question.question_text,
          response_type: rr.question.response_type,
          answer_text: rr.answer_text,
          overall_comment: rr.overall_comment,
          digital_signature: rr.digital_signature,
          signature_date: rr.signature_date,
          submitted_at: rr.submitted_at,
        })),
      })),
      total_count: user.candidate_references.length,
    };

    // shares/ - Consent share records
    const sharesData = {
      consent_shares: user.consent_shares_as_candidate.map((cs) => ({
        id: cs.id,
        shared_with: cs.client_user
          ? {
              id: cs.client_user.id,
              email: cs.client_user.email,
              name: [cs.client_user.first_name, cs.client_user.last_name]
                .filter(Boolean)
                .join(" "),
            }
          : null,
        checklist_response_id: cs.checklist_response_id,
        credential_id: cs.credential_id,
        resume_id: cs.resume_id,
        reference_id: cs.reference_id,
        is_deleted: cs.is_deleted,
        shared_at: cs.shared_at,
        expires_at: cs.expires_at,
      })),
      total_count: user.consent_shares_as_candidate.length,
    };

    // notifications/ - Notification history
    const notificationsData = {
      notifications: user.notifications.map((n) => ({
        id: n.id,
        message: n.message,
        type: n.type,
        is_read: n.is_read,
        related_entity_id: n.related_entity_id,
        created_at: n.created_at,
      })),
      total_count: user.notifications.length,
    };

    // audit-log.json - Audit trail
    const auditLogData = {
      audit_logs: user.audit_logs.map((al) => ({
        id: al.id,
        role: al.role,
        action: al.action,
        entity_type: al.entity_type,
        entity_id: al.entity_id,
        ip_address: al.ip_address,
        created_at: al.created_at,
      })),
      total_count: user.audit_logs.length,
    };

    // resumes data
    const resumesData = {
      resumes: resumesWithSignedUrls,
      total_count: resumesWithSignedUrls.length,
    };

    // ── Create ZIP ───────────────────────────────────────────────────
    const archive = new ZipArchive({ zlib: { level: 9 } });

    // Collect the zip buffer
    const chunks: Buffer[] = [];
    const stream = Readable.from(archive);
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));

    const zipDone = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    // Add files to the archive
    archive.append(JSON.stringify(profileData, null, 2), { name: "profile.json" });
    archive.append(JSON.stringify(credentialsData, null, 2), { name: "credentials/credentials.json" });
    archive.append(JSON.stringify(resumesData, null, 2), { name: "resumes/resumes.json" });
    archive.append(JSON.stringify(checklistsData, null, 2), { name: "checklists/checklists.json" });
    archive.append(JSON.stringify(referencesData, null, 2), { name: "references/references.json" });
    archive.append(JSON.stringify(sharesData, null, 2), { name: "shares/consent-shares.json" });
    archive.append(JSON.stringify(notificationsData, null, 2), { name: "notifications/notifications.json" });
    archive.append(JSON.stringify(auditLogData, null, 2), { name: "audit-log.json" });

    // Add metadata
    const manifest = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      hipaa_export: true,
      exported_by: `super_admin (user ${(session.user as Record<string, unknown>).id})`,
      files: [
        "profile.json",
        "credentials/credentials.json",
        "resumes/resumes.json",
        "checklists/checklists.json",
        "references/references.json",
        "shares/consent-shares.json",
        "notifications/notifications.json",
        "audit-log.json",
      ],
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    await archive.finalize();
    const zipBuffer = await zipDone;

    // ── Log the export ───────────────────────────────────────────────
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "hipaa_export_download",
        entity_type: "user",
        entity_id: userId,
      },
    });

    // ── Return ZIP ───────────────────────────────────────────────────
    const safeName = (user.email || `user-${userId}`).replace(/[^a-zA-Z0-9._-]/g, "_");

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="hipaa-export-${safeName}-${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[HIPAA_EXPORT] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate HIPAA export" },
      { status: 500 }
    );
  }
}
