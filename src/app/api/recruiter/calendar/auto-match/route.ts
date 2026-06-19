import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Pipeline stage weights for scoring (higher = closer to interview/hire)
// Uses the unified BOB status taxonomy
const STAGE_WEIGHTS: Record<string, number> = {
  new_lead: 10,
  doc_pending: 20,
  interested: 50,
  submitted: 30,
  interview_stage: 70,
  offer_sent: 80,
  offer_accepted: 85,
  onboarding: 90,
  on_assignment: 100,
  inactive: 0,
  not_interested: 0,
  blacklisted: 0,
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get recruiter's organization
    const recruiter = await db.user.findUnique({
      where: { id: userId },
      select: { organization_id: true },
    });

    if (!recruiter?.organization_id) {
      return NextResponse.json({ matches: [] });
    }

    // 1. Get all active leads (not in company pool or on assignment)
    const activeLeads = await db.recruiterLead.findMany({
      where: {
        recruiter_user_id: userId,
        is_active: true,
        pipeline_stage: { notIn: ["not_interested", "inactive", "blacklisted", "on_assignment"] },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        specialty: true,
        pipeline_stage: true,
        reached_for: true,
      },
    });

    // 2. Get candidates who have shared their calendars with this recruiter
    const shares = await db.calendarShare.findMany({
      where: {
        recruiter_user_id: userId,
        is_revoked: false,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } },
        ],
      },
      include: {
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            candidate_profile: {
              select: {
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (shares.length === 0 || activeLeads.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const candidateUserIds = shares.map((s) => s.candidate_user_id);

    // 3. Get candidate availabilities
    const availabilities = await db.calendarAvailability.findMany({
      where: {
        candidate_user_id: { in: candidateUserIds },
      },
      orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
    });

    // Build candidate data with availabilities
    const candidateMap = new Map<
      number,
      {
        userId: number;
        firstName: string | null;
        lastName: string | null;
        email: string;
        phone: string | null;
        specialty: string | null;
        availabilities: typeof availabilities;
        availabilityStatus: string;
      }
    >();

    for (const share of shares) {
      const cId = share.candidate_user_id;
      const candidate = share.candidate_user;

      if (!candidateMap.has(cId)) {
        candidateMap.set(cId, {
          userId: cId,
          firstName:
            candidate.candidate_profile?.first_name || candidate.first_name,
          lastName:
            candidate.candidate_profile?.last_name || candidate.last_name,
          email: candidate.email,
          phone: candidate.candidate_profile?.phone || null,
          specialty: null,
          availabilities: [],
          availabilityStatus: "unknown",
        });
      }
    }

    // Attach availabilities and determine availability status
    for (const avail of availabilities) {
      const candidate = candidateMap.get(avail.candidate_user_id);
      if (candidate) {
        candidate.availabilities.push(avail);
        if (avail.availability_status === "actively_looking") {
          candidate.availabilityStatus = "actively_looking";
        } else if (
          avail.availability_status === "open" &&
          candidate.availabilityStatus !== "actively_looking"
        ) {
          candidate.availabilityStatus = "open";
        } else if (
          avail.availability_status === "not_available" &&
          candidate.availabilityStatus === "unknown"
        ) {
          candidate.availabilityStatus = "not_available";
        }
      }
    }

    // Try to extract specialties from checklist templates / candidate profiles
    // For now, use availability label as a proxy for specialty
    // We'll also check if the candidate's availability labels match lead specialties
    for (const candidate of candidateMap.values()) {
      // Try to infer specialty from availability labels
      for (const avail of candidate.availabilities) {
        if (avail.label) {
          // Check if any lead specialty matches this label
          const matchingLead = activeLeads.find(
            (l) =>
              l.specialty &&
              avail.label &&
              avail.label.toLowerCase().includes(l.specialty.toLowerCase())
          );
          if (matchingLead?.specialty) {
            candidate.specialty = matchingLead.specialty;
            break;
          }
        }
      }
    }

    // 4. Match candidates to leads
    const matches: Array<{
      candidateId: number;
      candidateName: string;
      specialty: string | null;
      availabilityStatus: string;
      matchScore: number;
      matchReasons: string[];
      leadId: number;
      leadName: string;
      leadSpecialty: string | null;
    }> = [];

    for (const lead of activeLeads) {
      for (const candidate of candidateMap.values()) {
        const reasons: string[] = [];
        let score = 0;

        // Factor 1: Specialty overlap (0-40 points)
        if (lead.specialty && candidate.specialty) {
          const leadSpecLower = lead.specialty.toLowerCase();
          const candSpecLower = candidate.specialty.toLowerCase();
          if (leadSpecLower === candSpecLower) {
            score += 40;
            reasons.push("Exact specialty match");
          } else if (
            leadSpecLower.includes(candSpecLower) ||
            candSpecLower.includes(leadSpecLower)
          ) {
            score += 25;
            reasons.push("Partial specialty match");
          }
        } else if (lead.specialty && !candidate.specialty) {
          // Check if any availability label contains the lead specialty
          const hasRelevantLabel = candidate.availabilities.some(
            (a) =>
              a.label &&
              a.label.toLowerCase().includes(lead.specialty!.toLowerCase())
          );
          if (hasRelevantLabel) {
            score += 20;
            reasons.push("Availability matches specialty");
          }
        }

        // Factor 2: Availability overlap (0-35 points)
        const hasAvailableSlots = candidate.availabilities.some(
          (a) => a.is_available
        );
        const hasRecurringAvailability = candidate.availabilities.some(
          (a) => a.is_available && a.is_recurring
        );

        if (candidate.availabilityStatus === "actively_looking") {
          score += 35;
          reasons.push("Actively looking for positions");
        } else if (candidate.availabilityStatus === "open") {
          score += 20;
          reasons.push("Open to opportunities");
        }

        if (hasRecurringAvailability) {
          score += 10;
          reasons.push("Has recurring availability");
        } else if (hasAvailableSlots) {
          score += 5;
          reasons.push("Has some availability");
        }

        // Factor 3: Pipeline proximity (0-25 points)
        // Higher stage = closer to hire = more valuable match
        const leadStageWeight = STAGE_WEIGHTS[lead.pipeline_stage] ?? 10;
        const pipelineScore = Math.round((leadStageWeight / 100) * 25);
        if (pipelineScore > 5) {
          score += pipelineScore;
          reasons.push(`Lead in ${lead.pipeline_stage.replace(/_/g, " ")} stage`);
        }

        // Only include matches with meaningful score
        if (score >= 15) {
          matches.push({
            candidateId: candidate.userId,
            candidateName: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(),
            specialty: candidate.specialty,
            availabilityStatus: candidate.availabilityStatus,
            matchScore: Math.min(score, 100),
            matchReasons: reasons,
            leadId: lead.id,
            leadName: `${lead.first_name} ${lead.last_name}`,
            leadSpecialty: lead.specialty,
          });
        }
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_AUTO_MATCH_GET]", error);
    return NextResponse.json(
      { error: "Failed to compute auto-matches" },
      { status: 500 }
    );
  }
}
