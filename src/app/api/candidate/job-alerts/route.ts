import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/candidate/job-alerts
 * List all job alert subscriptions for the current candidate
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const subscriptions = await db.$queryRaw`
      SELECT * FROM "JobAlertSubscription" WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("[JOB_ALERTS] List error:", error);
    return NextResponse.json({ error: "Failed to fetch job alerts", subscriptions: [] }, { status: 200 });
  }
}

/**
 * POST /api/candidate/job-alerts
 * Create a new job alert subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const body = await request.json();
    const { specialty, state, city, employment_type, is_remote, keywords, email_frequency } = body;

    if (!specialty && !state && !city && !employment_type && !is_remote && !keywords) {
      return NextResponse.json({ error: "At least one filter is required" }, { status: 400 });
    }

    await db.$executeRaw`
      INSERT INTO "JobAlertSubscription" (user_id, specialty, state, city, employment_type, is_remote, keywords, email_frequency, is_active, created_at, updated_at)
      VALUES (${userId}, ${specialty || null}, ${state || null}, ${city || null}, ${employment_type || null}, ${is_remote || false}, ${keywords || null}, ${email_frequency || 'instant'}, true, NOW(), NOW())
    `;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[JOB_ALERTS] Create error:", error);
    return NextResponse.json({ error: "Failed to create job alert" }, { status: 500 });
  }
}

/**
 * DELETE /api/candidate/job-alerts?id=X
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = Number((session.user as Record<string, unknown>).id);
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.$executeRaw`DELETE FROM "JobAlertSubscription" WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[JOB_ALERTS] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

/**
 * PUT /api/candidate/job-alerts?id=X — toggle active/inactive
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = Number((session.user as Record<string, unknown>).id);
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.$executeRaw`
      UPDATE "JobAlertSubscription" SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[JOB_ALERTS] Toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle" }, { status: 500 });
  }
}
