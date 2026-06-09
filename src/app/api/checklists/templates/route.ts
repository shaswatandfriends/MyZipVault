import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin", "candidate"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all active templates with skill aggregation
    const templates = await db.checklistTemplate.findMany({
      where: { is_active: true },
      orderBy: [{ profession: "asc" }, { job_title: "asc" }, { specialty: "asc" }],
      include: {
        skills: {
          select: { category: true },
        },
      },
    });

    // Map to response format with computed fields
    const mapped = templates.map((t) => {
      const skillCount = t.skills.length;
      const categorySet = new Set(t.skills.map((s) => s.category));
      const categoryCount = categorySet.size;

      return {
        id: t.id,
        profession: t.profession,
        jobTitle: t.job_title ?? "",
        specialty: t.specialty,
        name: t.name,
        isActive: t.is_active,
        skillCount,
        categoryCount,
      };
    });

    // Build grouped structure: profession → jobTitle → templates[]
    const grouped: Record<string, Record<string, typeof mapped>> = {};
    for (const template of mapped) {
      const profession = template.profession;
      const jobTitle = template.jobTitle || "Unspecified";

      if (!grouped[profession]) {
        grouped[profession] = {};
      }
      if (!grouped[profession][jobTitle]) {
        grouped[profession][jobTitle] = [];
      }
      grouped[profession][jobTitle].push(template);
    }

    return NextResponse.json({ templates: mapped, grouped });
  } catch (error) {
    console.error("[CHECKLISTS_TEMPLATES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist templates" },
      { status: 500 }
    );
  }
}
