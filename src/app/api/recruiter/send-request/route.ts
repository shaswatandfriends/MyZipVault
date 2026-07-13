import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { logCreditsDeducted } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { sendRequestSchema, validateBody } from "@/lib/validation-schemas";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/rate-limiter";
import { onDocRequested } from "@/lib/bob/status-engine";
import { findLeadInRecruiterBob } from "@/lib/bob/lead-finder";
import { getPendingRequestExpiryDays } from "@/lib/checklist-settings";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // ─── Rate limit: max 20 send requests per user per hour ───
    const rateLimitKey = `user_${userId}`;
    const rateLimit = await checkRateLimit("send_request", rateLimitKey, 20, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();

    // ─── Zod validation ───
    const validation = validateBody(sendRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      specialty,
      checklistTemplateId,
      documents,
      requestedDocuments,
    } = validation.data;

    // Check if candidate already exists
    const existingUser = await db.user.findUnique({
      where: { email },
      include: { candidate_profile: true },
    });

    let candidateUserId: number;
    let isNewCandidate = false;
    let inviteTokenValue: string | null = null;

    if (existingUser) {
      // Candidate already exists
      if (existingUser.role !== "candidate") {
        return NextResponse.json(
          { error: "A user with this email already exists with a different role" },
          { status: 400 }
        );
      }
      candidateUserId = existingUser.id;
    } else {
      // Create new candidate user
      // Password hash is a CSPRNG placeholder — the candidate sets their
      // real password via the /onboard invite-token flow (see below).
      const { generatePlaceholderPasswordHash } = await import("@/lib/password-generator");
      const tempPassword = await generatePlaceholderPasswordHash();

      const newUser = await db.user.create({
        data: {
          email,
          password_hash: tempPassword,
          role: "candidate",
          is_approved: true,
          first_name: firstName,
          last_name: lastName,
          phone: phone ?? null,
          must_change_pass: true,
        },
      });

      await db.candidateProfile.create({
        data: {
          user_id: newUser.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone ?? "",
          profile_completion_pct: 0,
        },
      });

      candidateUserId = newUser.id;
      isNewCandidate = true;

      // Create invite token
      inviteTokenValue = uuidv4();
      await db.inviteToken.create({
        data: {
          token: inviteTokenValue,
          email,
          role: "candidate",
          token_type: "candidate_invite",
          invited_by: userId,
          organization_id: organizationId,
          nurse_name: `${firstName} ${lastName}`,
          is_used: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // ─── BOB: Link candidate_user_id to matching recruiter lead ────
    // If the recruiter has a lead in their BOB with this email, link the
    // candidate's User account to it. This makes all future hooks work:
    //   - onDocUploaded (candidate uploads credential → finds lead → logs activity)
    //   - onRtrSigned (candidate signs RTR → finds lead → updates status)
    //   - etc.
    // We link BOTH new and existing users (existing users might have been
    // created by another recruiter's request, but this lead still matches).
    try {
      const lead = await db.recruiterLead.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          recruiter_user_id: userId,
          candidate_user_id: null, // Only link if not already linked
        },
        select: { id: true },
      });
      if (lead) {
        await db.recruiterLead.update({
          where: { id: lead.id },
          data: { candidate_user_id: candidateUserId },
        });
        console.log(`[BOB LINK] Linked candidate_user_id ${candidateUserId} to lead ${lead.id}`);
      }
    } catch (linkErr) {
      console.error("[BOB LINK] Failed to link candidate to lead:", linkErr);
      // Non-blocking — request still proceeds
    }

    // Fetch checklist template name for reuse message
    const checklistTemplate = await db.checklistTemplate.findUnique({
      where: { id: Number(checklistTemplateId) },
      select: { name: true },
    });
    const checklistTemplateName = checklistTemplate?.name || "Unknown";

    // Fetch org early — needed for both pipeline-lock + reuse paths
    let org: any = null;
    try {
      org = await db.organization.findUnique({
        where: { id: organizationId },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

    // ─── Gap 2: Pipeline lock within company ───────────────────────
    // If another recruiter in the same org already has an active checklist
    // request for this candidate, BLOCK this request with a message
    // identifying the recruiter who has the lock.
    //
    // Rule: A candidate is "locked" in a company's pipeline if they have
    // a checklist_request from any recruiter in the org whose status is
    // NOT 'declined' or 'cancelled'. (We don't use 'not_interested' because
    // that's a recruiter-side lead stage, not a checklist request status.)
    //
    // Exception: Client Admin can override (per Gap 1 — they have full
    // visibility). They can send requests on behalf of any recruiter.
    if (organizationId) {
      // Find all recruiters in this org
      const orgRecruiters = await db.user.findMany({
        where: {
          organization_id: organizationId,
          role: { in: ["client_admin", "client_recruiter"] },
          account_status: "active",
        },
        select: { id: true, first_name: true, last_name: true },
      });
      const orgRecruiterIds = orgRecruiters.map((u) => u.id);
      const orgRecruiterMap = new Map(orgRecruiters.map((u) => [u.id, u]));

      // Find any existing checklist request for this candidate from any
      // recruiter in the org (excluding the current recruiter)
      const otherRecruiterIds = orgRecruiterIds.filter((id) => id !== userId);
      if (otherRecruiterIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let existingRequest: any = null;
        try {
          existingRequest = await db.checklistRequest.findFirst({
            where: {
              candidate_user_id: candidateUserId,
              client_user_id: { in: otherRecruiterIds },
              // Exclude explicitly closed/cancelled/expired requests —
              // expired requests no longer hold the pipeline lock
              status: { notIn: ["declined", "cancelled", "expired"] },
            },
            select: {
              id: true,
              client_user_id: true,
              status: true,
              created_at: true,
            },
            orderBy: { created_at: "desc" },
          });
        } catch (e) { console.error("[SCHEMA_DRIFT]", e); }

        if (existingRequest) {
          const lockingRecruiter = orgRecruiterMap.get(existingRequest.client_user_id);
          const lockingRecruiterName = lockingRecruiter
            ? `${lockingRecruiter.first_name ?? ""} ${lockingRecruiter.last_name ?? ""}`.trim() ||
              `Recruiter #${existingRequest.client_user_id}`
            : `Recruiter #${existingRequest.client_user_id}`;

          // Client admin override: allow the request but warn
          if (userRole === "client_admin") {
            console.warn(
              `[PIPELINE_LOCK] Client admin ${userId} overriding pipeline lock held by ${lockingRecruiterName} for candidate ${candidateUserId}`
            );
            // Continue with the request — client admin has override power
          } else {
            // Regular recruiter — block the request
            return NextResponse.json(
              {
                error: `This candidate is already in ${lockingRecruiterName}'s pipeline. Contact them or your admin.`,
                code: "PIPELINE_LOCKED",
                lockedBy: {
                  userId: existingRequest.client_user_id,
                  name: lockingRecruiterName,
                  status: existingRequest.status,
                  createdAt: existingRequest.created_at,
                },
              },
              { status: 409 } // 409 Conflict
            );
          }
        }
      }
    }

    // Check if there's an existing active checklist response for this candidate + template
    // (excludes superseded responses — those have superseded_by_id set)
    let existingResponse: any = null;
    try {
      existingResponse = await db.candidateChecklistResponse.findFirst({
        where: {
          candidate_user_id: candidateUserId,
          checklist_template_id: Number(checklistTemplateId),
          status: 'active',
          valid_until: { gte: new Date() }, // still valid
          superseded_by_id: null, // not superseded by a newer response
        },
        orderBy: { submitted_at: "desc" },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT]", e); }

    if (existingResponse) {
      // ─── Option B: explicit candidate consent ───────────────────────
      // Don't auto-share. Create a ChecklistRequest with status
      // "reuse_pending" + send the candidate an in-app notification asking
      // them to choose: "Approve Share" or "Complete New".
      //
      // The request links to the existing response so the candidate UI can
      // show "You completed this on [date]" and offer the two actions.
      //
      // expires_at is still set using the org's pending-expiry config so
      // that if the candidate ignores the consent prompt, it eventually
      // expires and frees the pipeline.
      const expiryDays = await getPendingRequestExpiryDays(organizationId);
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      const checklistRequest = await db.checklistRequest.create({
        data: {
          client_user_id: userId,
          candidate_user_id: candidateUserId,
          checklist_template_id: Number(checklistTemplateId),
          status: 'reuse_pending',
          completion_pct: 100,
          candidate_response_id: existingResponse.id,
          opened_at: new Date(),
          expires_at: expiresAt,
        },
      });

      // ─── Auto-create a RecruiterLead so the candidate appears in BOB ──
      // (same as fresh request path — ensures candidate detail page works)
      try {
        const existingLead = await db.recruiterLead.findFirst({
          where: {
            candidate_user_id: candidateUserId,
            organization_id: organizationId,
          },
          select: { id: true },
        });
        if (!existingLead) {
          await db.recruiterLead.create({
            data: {
              recruiter_user_id: userId,
              organization_id: organizationId,
              candidate_user_id: candidateUserId,
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone: phone ?? null,
              specialty: specialty ?? null,
              job_title: jobTitle ?? null,
              source: "other",
              pipeline_stage: "doc_pending",
              tag: "warm",
              last_activity_at: new Date(),
              last_activity_type: "checklist_request_sent",
            },
          });
        }
      } catch (leadErr) {
        console.error("[SEND_REQUEST] Failed to auto-create RecruiterLead (reuse path):", leadErr);
      }

      // Notify candidate: consent prompt
      try {
        const recruiterName = (session.user as Record<string, unknown>).name as string || "A recruiter";
        await db.notification.create({
          data: {
            user_id: candidateUserId,
            title: "Checklist share request",
            message: `${recruiterName} requested your ${checklistTemplateName} checklist. You already have a valid one — share it or complete a new one?`,
            type: "checklist_share_request",
            related_entity_id: checklistRequest.id,
            related_entity_type: "checklist_request",
            metadata: JSON.stringify({
              existing_response_id: existingResponse.id,
              checklist_template_id: Number(checklistTemplateId),
              checklist_name: checklistTemplateName,
              recruiter_user_id: userId,
              recruiter_name: recruiterName,
              submitted_at: existingResponse.submitted_at,
            }),
          },
        });
      } catch (e) {
        console.error("[SEND_REQUEST] Failed to create reuse_pending notification:", e);
      }

      // Send email to candidate (existing-candidate path)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
      const loginLink = `${appUrl}/checklists`;
      const candidateName = `${firstName} ${lastName}`;
      sendEmail({
        to: email,
        templateKey: "checklist_request",
        variables: {
          candidate_name: candidateName,
          client_name: org?.name || "MyZipVault",
          checklist_name: checklistTemplateName,
          login_link: loginLink,
        },
        phone: phone || undefined,
      }).catch((err) => {
        console.error("[EMAIL] Failed to send checklist reuse-request email:", err);
      });

      return NextResponse.json({
        success: true,
        checklistRequestId: checklistRequest.id,
        candidateUserId,
        isNewCandidate,
        reusePending: true,
        message: `${firstName} ${lastName} already has a valid ${checklistTemplateName} checklist. We've asked them to share it or complete a new one.`,
      }, { status: 201 });
    }

    // ─── Fresh request path ───────────────────────────────────────────
    // No existing valid response — candidate must complete from scratch.
    // Set expires_at based on the org's pending-request-expiry config.
    const expiryDays = await getPendingRequestExpiryDays(organizationId);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const checklistRequest = await db.checklistRequest.create({
      data: {
        client_user_id: userId,
        candidate_user_id: candidateUserId,
        checklist_template_id: Number(checklistTemplateId),
        status: "sent",
        completion_pct: 0,
        expires_at: expiresAt,
      },
    });

    // ─── Auto-create a RecruiterLead so the candidate appears in BOB ──
    // Without this, the candidate detail page (/recruiter/candidates/[id])
    // fails with "Lead not found" because it looks up by RecruiterLead.
    // Only create if no lead already exists for this candidate + recruiter.
    try {
      const existingLead = await db.recruiterLead.findFirst({
        where: {
          candidate_user_id: candidateUserId,
          organization_id: organizationId,
        },
        select: { id: true },
      });
      if (!existingLead) {
        await db.recruiterLead.create({
          data: {
            recruiter_user_id: userId,
            organization_id: organizationId,
            candidate_user_id: candidateUserId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone ?? null,
            specialty: specialty ?? null,
            job_title: jobTitle ?? null,
            source: "other",
            pipeline_stage: "doc_pending",
            tag: "warm",
            last_activity_at: new Date(),
            last_activity_type: "checklist_request_sent",
          },
        });
      }
    } catch (leadErr) {
      console.error("[SEND_REQUEST] Failed to auto-create RecruiterLead:", leadErr);
      // Non-fatal — the checklist request was already created successfully
    }

    // Create share request if documents are requested OR specific credentials are requested
    const hasBroadDocs = documents && Array.isArray(documents) && documents.length > 0;
    const hasSpecificDocs = requestedDocuments && requestedDocuments.length > 0;
    if (hasBroadDocs || hasSpecificDocs) {
      await db.shareRequest.create({
        data: {
          candidate_user_id: candidateUserId,
          client_user_id: userId,
          request_checklists: documents?.includes("checklist") ?? false,
          request_credentials: documents?.includes("credential") ?? false,
          request_resume: documents?.includes("resume") ?? false,
          request_references: documents?.includes("reference") ?? false,
          requested_documents: hasSpecificDocs
            ? JSON.stringify(requestedDocuments)
            : null,
          status: "pending",
          message: `Please share your ${documents?.join(", ") || "documents"} with us.`,
        },
      });
    }

    // Deduct credits for the request (1 credit per document requested)
    const docCount = (documents?.length ?? 0) + (requestedDocuments?.length ?? 0);
    const totalCredits = 1 + docCount; // 1 for checklist request + 1 per document

    if (org && org.credits_balance < totalCredits) {
      // Not enough credits — still create the request but don't deduct
      // In production, we'd block this; for now, allow it
    }

    if (org && org.credits_balance >= totalCredits) {
      // ─── Gap 11 fix: atomic conditional update ───
      // Only succeeds if credits_balance is still >= totalCredits at the
      // moment of update. If two concurrent requests both passed the check
      // above, only one will actually deduct — the other gets count=0.
      const deductResult = await db.organization.updateMany({
        where: {
          id: organizationId,
          credits_balance: { gte: totalCredits },
        },
        data: {
          credits_balance: { decrement: totalCredits },
        },
      });

      if (deductResult.count > 0) {
        // Deduction succeeded — create the audit transaction record
        await db.creditTransaction.create({
          data: {
            organization_id: organizationId,
            transaction_type: "deduction",
            credit_amount: -totalCredits,
            description: `Checklist request sent to ${firstName} ${lastName} (${docCount} documents)`,
          },
        });

        // Audit log for credit deduction
        await logCreditsDeducted(userId, organizationId, totalCredits);

        // ─── Credit balance low notification (to org admin) ───
        try {
          // Re-fetch org to get the post-deduction balance
          const orgAfterDeduction = await db.organization.findUnique({
            where: { id: organizationId },
            select: { credits_balance: true },
          });
          const newBalance = orgAfterDeduction?.credits_balance ?? 0;

          if (newBalance < 20) {
            // Find the org's admin to notify
            const admin = await db.user.findFirst({
              where: { organization_id: organizationId, role: "client_admin" },
              select: { id: true },
            });

            if (admin) {
              const { createNotification } = await import("@/lib/notifications/create");
              await createNotification({
                userId: admin.id,
                category: "credit",
                priority: "important",
                title: "Credit balance low ⚠️",
                message: `Your organization has ${newBalance} credits remaining. Consider purchasing more.`,
                actionUrl: "/recruiter/billing",
                actionLabel: "Purchase credits",
                relatedEntityId: organizationId,
                relatedEntityType: "organization",
              });
            }
          }
        } catch (creditNotifErr) {
          console.error("[SEND_REQUEST] Failed to send credit low notification:", creditNotifErr);
          // Non-blocking
        }
      } else {
        // Race condition lost — another concurrent request consumed the credits first
        console.warn(
          `[SEND_REQUEST] Race condition — org ${organizationId} credits deducted by concurrent request. Skipping deduction for this request.`
        );
      }
    }

    // Update user last activity
    await db.user.update({
      where: { id: userId },
      data: { last_activity_at: new Date() },
    });

    // Send email notification to candidate (non-blocking)
    const companyName = org?.name || "MyZipVault";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
    const candidateName = `${firstName} ${lastName}`;
    const checklistDisplayName = checklistTemplateName;

    if (isNewCandidate && inviteTokenValue) {
      // New candidate: send invite email with link to set up account
      const inviteLink = `${appUrl}/onboard?token=${inviteTokenValue}`;
      sendEmail({
        to: email,
        templateKey: "candidate_invite",
        variables: {
          candidate_name: candidateName,
          client_name: companyName,
          invite_link: inviteLink,
          checklist_name: checklistDisplayName,
        },
        phone: phone || undefined,
      }).catch((err) => {
        console.error("[EMAIL] Failed to send candidate invite email:", err);
      });
    } else {
      // Existing candidate: send checklist request email with login link
      const loginLink = `${appUrl}/login`;
      sendEmail({
        to: email,
        templateKey: "checklist_request",
        variables: {
          candidate_name: candidateName,
          client_name: companyName,
          checklist_name: checklistDisplayName,
          login_link: loginLink,
        },
        phone: phone || undefined,
      }).catch((err) => {
        console.error("[EMAIL] Failed to send checklist request email:", err);
      });
    }

    // ─── In-app notification to candidate ──────────────────────────
    try {
      const orgName = (await db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }))?.name || "MyZipVault";

      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: candidateUserId,
        category: "compliance",
        priority: "urgent",
        title: `New request from ${orgName}`,
        message: `${orgName} sent you a ${checklistTemplateName} checklist${documents?.length ? ` and requested ${documents.join(", ")}` : ""}. Log in to complete it.`,
        actionUrl: "/dashboard",
        actionLabel: "View request",
        relatedEntityId: checklistRequest.id,
        relatedEntityType: "checklist_request",
      });
    } catch (notifErr) {
      console.error("[SEND_REQUEST] Failed to create candidate notification:", notifErr);
      // Non-blocking
    }

    // ─── BOB status engine hook (non-blocking) ────────────────────
    // If the recruiter has a lead in their BOB matching this candidate's
    // email, fire onDocRequested to flip the lead to "Doc Pending".
    // This makes the Send Request flow correlate with the BOB system.
    if (documents && Array.isArray(documents) && documents.length > 0) {
      try {
        const lead = await findLeadInRecruiterBob(email, userId);
        if (lead) {
          // Fire onDocRequested for each requested document type
          for (const docType of documents) {
            await onDocRequested({
              leadId: lead.id,
              docType,
              actorUserId: userId,
            });
          }
          console.log(`[BOB HOOK] onDocRequested fired for lead ${lead.id}, docs: ${documents.join(", ")}`);
        }
      } catch (bobErr) {
        console.error("[BOB HOOK] Failed to fire doc-requested hook:", bobErr);
        // Non-blocking — request was already created
      }
    }

    return NextResponse.json({
      success: true,
      checklistRequestId: checklistRequest.id,
      candidateUserId,
      isNewCandidate,
      creditsCharged: totalCredits,
      message: isNewCandidate
        ? `Invitation sent to ${firstName} ${lastName} at ${email}`
        : `Checklist request sent to existing candidate ${firstName} ${lastName}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Send request POST error:", error);
    return NextResponse.json(
      { error: "Failed to send request" },
      { status: 500 }
    );
  }
}
