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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const expiration = searchParams.get("expiration") || "all";
    const templateId = searchParams.get("templateId") || "";

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find candidates who have checklist responses
    const candidates = await db.user.findMany({
      where: {
        role: "candidate",
        ...(search
          ? {
              OR: [
                { first_name: { contains: search, mode: "insensitive" } },
                { last_name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        candidate_checklist_responses: { some: {} },
      },
      include: {
        candidate_checklist_responses: {
          where: {
            ...(templateId ? { checklist_template_id: parseInt(templateId) } : {}),
            ...(status === "submitted"
              ? { status: "submitted" }
              : status === "active"
              ? { status: "active" }
              : {}),
            ...(expiration === "expiring"
              ? { valid_until: { gte: now, lte: sevenDaysFromNow } }
              : expiration === "expired"
              ? { valid_until: { lt: now } }
              : expiration === "valid"
              ? { valid_until: { gt: now } }
              : {}),
          },
          include: {
            checklist_template: { select: { id: true, profession: true, specialty: true, name: true } },
            skill_ratings: true,
          },
          orderBy: { valid_until: "asc" },
        },
      },
      orderBy: { last_activity_at: "desc" },
    });

    // Stats
    const totalCandidates = candidates.length;
    let activeChecklists = 0;
    let expiringWithin7 = 0;
    let expired = 0;

    for (const c of candidates) {
      for (const resp of c.candidate_checklist_responses) {
        if (resp.status === "active") activeChecklists++;
        if (resp.valid_until < now) expired++;
        else if (resp.valid_until <= sevenDaysFromNow) expiringWithin7++;
      }
    }

    return NextResponse.json({
      candidates: candidates.map((c) => {
        const responses = c.candidate_checklist_responses;
        const completed = responses.filter((r) => r.status === "submitted").length;
        const inProgress = responses.filter((r) => r.status === "active").length;
        const expiring = responses.filter(
          (r) => r.status === "active" && r.valid_until > now && r.valid_until <= sevenDaysFromNow
        ).length;
        const expiredCount = responses.filter((r) => r.valid_until < now).length;

        return {
          id: c.id,
          email: c.email,
          firstName: c.first_name,
          lastName: c.last_name,
          totalChecklists: responses.length,
          completed,
          inProgress,
          expiring,
          expired: expiredCount,
          responses: responses.map((r) => ({
            id: r.id,
            status: r.status,
            validUntil: r.valid_until,
            submittedAt: r.submitted_at,
            digitalSignature: r.digital_signature,
            candidateNameSigned: r.candidate_name_signed,
            template: r.checklist_template
              ? {
                  id: r.checklist_template.id,
                  profession: r.checklist_template.profession,
                  specialty: r.checklist_template.specialty,
                  name: r.checklist_template.name,
                }
              : null,
            skillRatingsCount: r.skill_ratings.length,
          })),
        };
      }),
      stats: {
        totalCandidates,
        activeChecklists,
        expiringWithin7,
        expired,
      },
    });
  } catch (error) {
    console.error("Skills Users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch candidates data" }, { status: 500 });
  }
}
