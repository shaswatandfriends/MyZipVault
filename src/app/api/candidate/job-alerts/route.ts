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
    const subscriptions = await db.jobAlertSubscription.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("[JOB_ALERTS] List error:", error);
    return NextResponse.json({ error: "Failed to fetch job alerts" }, { status: 500 });
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

    // Must have at least one filter
    if (!specialty && !state && !city && !employment_type && !is_remote && !keywords) {
      return NextResponse.json({ error: "At least one filter is required" }, { status: 400 });
    }

    const subscription = await db.jobAlertSubscription.create({
      data: {
        user_id: userId,
        specialty: specialty || null,
        state: state || null,
        city: city || null,
        employment_type: employment_type || null,
        is_remote: is_remote || false,
        keywords: keywords || null,
        email_frequency: email_frequency || "instant",
        is_active: true,
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("[JOB_ALERTS] Create error:", error);
    return NextResponse.json({ error: "Failed to create job alert" }, { status: 500 });
  }
}

/**
 * DELETE /api/candidate/job-alerts
 * Delete a job alert subscription by id (passed as ?id=X query param)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Verify ownership before deleting
    const subscription = await db.jobAlertSubscription.findFirst({
      where: { id, user_id: userId },
    });
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await db.jobAlertSubscription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[JOB_ALERTS] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete job alert" }, { status: 500 });
  }
}

/**
 * PUT /api/candidate/job-alerts
 * Toggle active/inactive for a subscription (?id=X)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    const subscription = await db.jobAlertSubscription.findFirst({
      where: { id, user_id: userId },
    });
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const updated = await db.jobAlertSubscription.update({
      where: { id },
      data: { is_active: !subscription.is_active },
    });

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error("[JOB_ALERTS] Toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle job alert" }, { status: 500 });
  }
}
