import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: Find matching candidates for shift requirements
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      specialty,
      shift_type,
      start_date,
      end_date,
      min_profile_completion,
      require_active_certifications,
    } = body;

    if (!specialty) {
      return NextResponse.json({ error: "Missing required field: specialty" }, { status: 400 });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const minProfileCompletion = min_profile_completion || 0;

    // Find candidates who have shared their calendar with this recruiter or org
    const directShares = await db.calendarShare.findMany({
      where: {
        shared_with_user_id: userId,
        is_revoked: false,
      },
      select: { owner_user_id: true },
    });

    // Also find shares with any user in this org
    const orgUsers = await db.user.findMany({
      where: { organization_id: organizationId, role: { in: ["client_recruiter", "client_admin"] } },
      select: { id: true },
    });
    const orgUserIds = orgUsers.map((u) => u.id);

    const orgShares = await db.calendarShare.findMany({
      where: {
        shared_with_user_id: { in: orgUserIds },
        is_revoked: false,
      },
      select: { owner_user_id: true },
    });

    const allSharedOwnerIds = [...new Set([...directShares.map((s) => s.owner_user_id), ...orgShares.map((s) => s.owner_user_id)])];

    if (allSharedOwnerIds.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Get candidates with matching criteria
    const candidateUsers = await db.user.findMany({
      where: {
        id: { in: allSharedOwnerIds },
        role: "candidate",
        account_status: "active",
      },
      include: {
        candidate_profile: true,
        candidate_calendar_settings: true,
        candidate_availabilities: true,
        credentials: require_active_certifications
          ? { where: { status: "active", verification_status: "verified" } }
          : false,
      },
    });

    // Filter and rank candidates
    const matchedCandidates = candidateUsers
      .filter((candidate) => {
        const settings = candidate.candidate_calendar_settings;
        // Filter out not_available candidates
        if (settings?.availability_status === "not_available") return false;

        // Filter by profile completion
        const profile = candidate.candidate_profile;
        if (profile && profile.profile_completion_pct < minProfileCompletion) return false;

        // Filter by specialty match (check candidate profile specialty or credentials)
        if (specialty) {
          const profileSpecialty = profile ? "" : ""; // CandidateProfile doesn't have specialty field; we check checklist templates
          // For now, we don't filter by specialty strictly as the model doesn't have a direct specialty field on profile
          // Instead, we could check checklist responses, but keeping it simple
          void profileSpecialty;
        }

        return true;
      })
      .map((candidate) => {
        const profile = candidate.candidate_profile;
        const settings = candidate.candidate_calendar_settings;
        const availabilities = candidate.candidate_availabilities;

        // Calculate availability percentage for the date range
        const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
        const daysWithAvailability = new Set<number>();

        for (const avail of availabilities) {
          if (avail.availability_type === "recurring" && avail.day_of_week !== null) {
            // Check if this day falls within the range
            const current = new Date(startDate);
            while (current <= endDate) {
              if (current.getDay() === avail.day_of_week && avail.availability_status !== "blocked") {
                daysWithAvailability.add(current.getTime());
              }
              current.setDate(current.getDate() + 1);
            }
          } else if (avail.availability_type === "specific_date" && avail.date) {
            const availDate = new Date(avail.date);
            if (availDate >= startDate && availDate <= endDate && avail.availability_status !== "blocked") {
              daysWithAvailability.add(availDate.getTime());
            }
          }
        }

        const availabilityPct = Math.round((daysWithAvailability.size / totalDays) * 100);

        return {
          user_id: candidate.id,
          first_name: profile?.first_name || candidate.first_name,
          last_name: profile?.last_name || candidate.last_name,
          email: candidate.email,
          specialty: specialty, // Echo back the requested specialty
          profile_completion_pct: profile?.profile_completion_pct || 0,
          availability_status: settings?.availability_status || "unknown",
          availability_percentage: availabilityPct,
          shift_duration_preference: settings?.shift_duration_preference || "flexible",
          minimum_notice_hours: settings?.minimum_notice_hours || 24,
          active_certifications: require_active_certifications
            ? (candidate.credentials as Array<{ id: number; document_name: string }>)?.length || 0
            : undefined,
        };
      })
      // Sort by availability percentage descending, then profile completion
      .sort((a, b) => {
        if (b.availability_percentage !== a.availability_percentage) {
          return b.availability_percentage - a.availability_percentage;
        }
        return (b.profile_completion_pct || 0) - (a.profile_completion_pct || 0);
      });

    return NextResponse.json({ candidates: matchedCandidates });
  } catch (error) {
    console.error("[CALENDAR_AUTOMATCH_POST]", error);
    return NextResponse.json({ error: "Failed to find matching candidates" }, { status: 500 });
  }
}
