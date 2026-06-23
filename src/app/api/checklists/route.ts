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
    const userRole = (session.user as Record<string, unknown>).role;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const responseId = searchParams.get("responseId");

    // Get skills for a template
    if (templateId) {
      const skills = await db.skill.findMany({
        where: { checklist_template_id: Number(templateId) },
        orderBy: { sort_order: "asc" },
      });
      return NextResponse.json({ skills });
    }

    // Get ratings for a response
    if (responseId) {
      const ratings = await db.skillRating.findMany({
        where: { checklist_response_id: Number(responseId) },
      });
      return NextResponse.json({ ratings });
    }

    // Get checklist requests for candidate
    if (userRole === "candidate") {
      const checklists = await (async () => {
        try {
          return await db.checklistRequest.findMany({
            where: { candidate_user_id: userId },
            include: {
              checklist_template: {
                select: { id: true, name: true, profession: true, specialty: true },
              },
              client_user: {
                select: {
                  first_name: true,
                  last_name: true,
                  organization: { select: { name: true } },
                },
              },
              candidate_response: {
                select: {
                  id: true,
                  status: true,
                  submitted_at: true,
                  digital_signature: true,
                },
              },
            },
            orderBy: { created_at: "desc" },
          });
        } catch (e) {
          console.error("[SCHEMA_DRIFT] query failed:", e);
          return [];
        }
      })();
      return NextResponse.json({ checklists });
    }

    return NextResponse.json({ checklists: [] });
  } catch (error) {
    console.error("Checklists GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    return NextResponse.json({ message: "Checklist request endpoint", data: body }, { status: 201 });
  } catch (error) {
    console.error("Checklists POST error:", error);
    return NextResponse.json(
      { error: "Failed to create checklist request" },
      { status: 500 }
    );
  }
}
