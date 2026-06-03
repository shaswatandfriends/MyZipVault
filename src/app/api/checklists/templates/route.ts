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

    if (!["client_recruiter", "client_admin", "platform_admin", "super_admin", "candidate"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await db.checklistTemplate.findMany({
      where: { is_active: true },
      select: {
        id: true,
        profession: true,
        specialty: true,
        name: true,
        created_at: true,
      },
      orderBy: [{ profession: "asc" }, { specialty: "asc" }],
    });

    // Get skill counts for each template
    const templatesWithCounts = await Promise.all(
      templates.map(async (t) => {
        const skillCount = await db.skill.count({
          where: { checklist_template_id: t.id },
        });
        return {
          ...t,
          skillCount,
        };
      })
    );

    return NextResponse.json({ templates: templatesWithCounts });
  } catch (error) {
    console.error("Checklist templates GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist templates" },
      { status: 500 }
    );
  }
}
