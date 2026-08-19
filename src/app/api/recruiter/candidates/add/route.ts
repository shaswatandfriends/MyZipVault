import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone, formatPhoneDisplay } from "@/lib/phone-normalize";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/recruiter/candidates/add
 *
 * Recruiter adds a new candidate from their network (Path B).
 *
 * Dedup logic (per user's spec):
 *   - If email OR phone matches an existing CandidateContactInfo:
 *     → Return the existing CandidateRecord (no new record created)
 *     → No ownership window created
 *     → Response includes is_duplicate=true
 *   - If BOTH email AND phone are new (no match):
 *     → Create new CandidateRecord (source='recruiter_submitted')
 *     → Create CandidateContactInfo entries for email + phone
 *     → Create CandidateOwnershipWindow (90-day exclusive)
 *     → Response includes is_duplicate=false, ownership window info
 *
 * Body:
 *   - name (required, min 2 chars)
 *   - email (required)
 *   - phone (required)
 *   - city, state, job_title, specialty (optional)
 *
 * 90-day exclusive ownership starts IMMEDIATELY at candidate creation
 * (per user's spec — clock starts at candidate creation, not RTR signature).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organization_id as number | undefined;

    const body = await request.json();
    const { name, email, phone, city, state, job_title, specialty } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    // Normalize contact info
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail) {
      return NextResponse.json({ error: `Invalid email format: "${email}"` }, { status: 400 });
    }
    if (!normalizedPhone) {
      return NextResponse.json({ error: `Invalid phone format: "${phone}" (expected US format)` }, { status: 400 });
    }

    // ─── Dedup check ──────────────────────────────────────────────────
    // Look up by email OR phone in CandidateContactInfo (not soft-deleted)
    const existingContact = await db.candidateContactInfo.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { type: "email", value_normalized: normalizedEmail },
          { type: "phone", value_normalized: normalizedPhone },
        ],
      },
      select: {
        id: true,
        type: true,
        value_normalized: true,
        candidate_record: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            city: true,
            state: true,
            job_title: true,
            specialty: true,
            profession: true,
            source: true,
            claimed_by_user_id: true,
            ownership_windows: {
              where: { is_active: true },
              take: 1,
              select: { recruiter_user_id: true, current_phase: true, exclusive_window_end: true },
            },
          },
        },
      },
    });

    if (existingContact) {
      // Duplicate found — return the existing record
      const rec = existingContact.candidate_record;
      const ownerInfo = rec.ownership_windows[0];
      const isMine = ownerInfo?.recruiter_user_id === userId;

      try {
        await logAudit({
          userId,
          role: userRole,
          action: "recruiter_attempted_add_duplicate_candidate",
          entityType: "candidate_record",
          entityId: rec.id,
          details: `Attempted to add ${name} (${email} / ${phone}) — matched existing record by ${existingContact.type}.`,
        });
      } catch (auditErr) {
        console.error("[AUDIT_LOG] Failed to log duplicate add:", auditErr);
      }

      return NextResponse.json({
        success: true,
        is_duplicate: true,
        matched_field: existingContact.type, // 'email' or 'phone'
        candidate: {
          id: rec.id,
          fullName: [rec.first_name, rec.last_name].filter(Boolean).join(" "),
          city: rec.city,
          state: rec.state,
          jobTitle: rec.job_title,
          specialty: rec.specialty,
          profession: rec.profession,
          source: rec.source,
          is_claimed: !!rec.claimed_by_user_id,
          ownership_phase: ownerInfo?.current_phase ?? "open",
          is_owner: isMine,
          ownership_end: ownerInfo?.exclusive_window_end,
        },
        message: `This candidate already exists in the system (matched by ${existingContact.type}). Use them directly or update their contact info.`,
      }, { status: 200 });
    }

    // ─── No duplicate — create new record (Path B) ────────────────────
    // Split name into first/last
    const trimmedName = name.trim();
    const spaceIdx = trimmedName.indexOf(" ");
    const firstName = spaceIdx === -1 ? trimmedName : trimmedName.substring(0, spaceIdx).trim();
    const lastName = spaceIdx === -1 ? "" : trimmedName.substring(spaceIdx + 1).trim();

    const now = new Date();
    const exclusiveEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days
    const residualEnd = new Date(exclusiveEnd.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 more days

    // Use a transaction for atomicity
    const newRecord = await db.$transaction(async (tx) => {
      // 1. Create the CandidateRecord
      const record = await tx.candidateRecord.create({
        data: {
          first_name: firstName,
          last_name: lastName || null,
          city: city?.trim() || null,
          state: state?.trim().toUpperCase() || null,
          job_title: job_title?.trim() || null,
          specialty: specialty?.trim() || null,
          source: "recruiter_submitted",
          original_owner_recruiter_id: userId,
        },
        select: { id: true, first_name: true, last_name: true },
      });

      // 2. Create CandidateContactInfo entries (email + phone)
      // The phone display value is formatted, the email is lowercased.
      const contactData = [
        {
          candidate_record_id: record.id,
          type: "email",
          value: email.trim().toLowerCase(),
          value_normalized: normalizedEmail,
          is_primary: true,
          added_by_recruiter_id: userId,
          added_by_candidate: false,
          // Recruiter-added info stays private for 90 days (matches exclusive window)
          is_visible_to_others: false,
          visible_after: exclusiveEnd,
        },
        {
          candidate_record_id: record.id,
          type: "phone",
          value: formatPhoneDisplay(normalizedPhone),
          value_normalized: normalizedPhone,
          is_primary: true,
          added_by_recruiter_id: userId,
          added_by_candidate: false,
          is_visible_to_others: false,
          visible_after: exclusiveEnd,
        },
      ];
      await tx.candidateContactInfo.createMany({ data: contactData });

      // 3. Create the ownership window (90-day exclusive + 90-180 residual)
      await tx.candidateOwnershipWindow.create({
        data: {
          candidate_record_id: record.id,
          recruiter_user_id: userId,
          organization_id: organizationId ?? null,
          exclusive_window_start: now,
          exclusive_window_end: exclusiveEnd,
          residual_window_end: residualEnd,
          current_phase: "exclusive",
          phase_computed_at: now,
          is_active: true,
        },
      });

      return record;
    });

    // Audit log
    try {
      await logAudit({
        userId,
        role: userRole,
        action: "recruiter_added_new_candidate_path_b",
        entityType: "candidate_record",
        entityId: newRecord.id,
        details: `Added ${firstName} ${lastName} (${email} / ${phone}) via Path B. 90-day exclusive ownership started.`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log Path B add:", auditErr);
    }

    return NextResponse.json({
      success: true,
      is_duplicate: false,
      candidate: {
        id: newRecord.id,
        fullName: [newRecord.first_name, newRecord.last_name].filter(Boolean).join(" "),
        firstName: newRecord.first_name,
        lastName: newRecord.last_name,
      },
      ownership: {
        phase: "exclusive",
        exclusive_window_end: exclusiveEnd.toISOString(),
        residual_window_end: residualEnd.toISOString(),
        recruiter_payout_pct: 75,
        platform_payout_pct: 25,
      },
      message: `${firstName} ${lastName} added. You have 90-day exclusive ownership (75/25 split). After 90 days, other recruiters can submit them and you'll get 2% residual through day 180.`,
    }, { status: 201 });
  } catch (error) {
    console.error("[RECRUITER_ADD_CANDIDATE]", error);
    return NextResponse.json({ error: "Failed to add candidate" }, { status: 500 });
  }
}
