import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get candidate calendar settings
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

    let settings = await db.candidateCalendarSetting.findUnique({
      where: { user_id: userId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await db.candidateCalendarSetting.create({
        data: { user_id: userId },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[CALENDAR_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT: Update candidate calendar settings
export async function PUT(request: Request) {
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
    const allowedFields = [
      "minimum_notice_hours",
      "shift_duration_preference",
      "response_deadline_hours",
      "preferred_facilities",
      "availability_status",
      "quick_override_active",
      "quick_override_date",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "quick_override_date") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === "preferred_facilities") {
          // Store as JSON string
          updateData[field] = typeof body[field] === "string" ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // If quick_override_active is being set to true, also set quick_override_date
    if (body.quick_override_active === true && !body.quick_override_date) {
      updateData.quick_override_date = new Date();
    }

    const settings = await db.candidateCalendarSetting.upsert({
      where: { user_id: userId },
      update: updateData,
      create: {
        user_id: userId,
        ...updateData,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[CALENDAR_SETTINGS_PUT]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
