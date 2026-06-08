import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const specialtyFilter = searchParams.get("specialty");

    // Find active, non-expired calendar shares for this recruiter
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

    const candidateUserIds = shares.map((s) => s.candidate_user_id);

    if (candidateUserIds.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    // Build availability filter
    const availWhere: Record<string, unknown> = {
      candidate_user_id: { in: candidateUserIds },
    };

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      // Filter on specific_date for date ranges, or include recurring entries
      availWhere.OR = [
        { specific_date: dateFilter },
        { is_recurring: true },
      ];
    }

    // Fetch availabilities
    const availabilities = await db.calendarAvailability.findMany({
      where: availWhere,
      orderBy: [
        { day_of_week: "asc" },
        { specific_date: "asc" },
        { start_time: "asc" },
      ],
    });

    // Build candidate calendar data with profile info
    const candidateMap = new Map<number, {
      userId: number;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
      specialty: string | null;
      availabilities: typeof availabilities;
    }>();

    for (const share of shares) {
      const cId = share.candidate_user_id;
      const candidate = share.candidate_user;

      if (!candidateMap.has(cId)) {
        candidateMap.set(cId, {
          userId: cId,
          firstName: candidate.candidate_profile?.first_name || candidate.first_name,
          lastName: candidate.candidate_profile?.last_name || candidate.last_name,
          email: candidate.email,
          phone: candidate.candidate_profile?.phone || null,
          specialty: null,
          availabilities: [],
        });
      }
    }

    // Attach availabilities to candidates
    for (const avail of availabilities) {
      const candidate = candidateMap.get(avail.candidate_user_id);
      if (candidate) {
        candidate.availabilities.push(avail);
      }
    }

    // Apply search and specialty filters
    let candidates = Array.from(candidateMap.values());

    if (search) {
      const searchLower = search.toLowerCase();
      candidates = candidates.filter(
        (c) =>
          (c.firstName && c.firstName.toLowerCase().includes(searchLower)) ||
          (c.lastName && c.lastName.toLowerCase().includes(searchLower)) ||
          c.email.toLowerCase().includes(searchLower)
      );
    }

    if (specialtyFilter) {
      candidates = candidates.filter((c) => c.specialty === specialtyFilter);
    }

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_CANDIDATES_CALENDARS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate calendars" },
      { status: 500 }
    );
  }
}
