import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: Save availability template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden — candidate role required" }, { status: 403 });
    }

    const body = await request.json();
    const { template_name, slots } = body;

    if (!template_name || !slots) {
      return NextResponse.json(
        { error: "Missing required fields: template_name, slots" },
        { status: 400 }
      );
    }

    // slots should be a JSON array of {day_of_week, start_time, end_time, status}
    const slotsJson = typeof slots === "string" ? slots : JSON.stringify(slots);

    const template = await db.availabilityTemplate.create({
      data: {
        candidate_user_id: userId,
        template_name,
        slots: slotsJson,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_AVAILABILITY_TEMPLATE_POST]", error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

// GET: Get candidate's templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden — candidate role required" }, { status: 403 });
    }

    const templates = await db.availabilityTemplate.findMany({
      where: { candidate_user_id: userId },
      orderBy: { created_at: "desc" },
    });

    // Parse slots JSON for each template
    const parsedTemplates = templates.map((t) => ({
      ...t,
      slots: JSON.parse(t.slots),
    }));

    return NextResponse.json({ templates: parsedTemplates });
  } catch (error) {
    console.error("[CALENDAR_AVAILABILITY_TEMPLATE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
