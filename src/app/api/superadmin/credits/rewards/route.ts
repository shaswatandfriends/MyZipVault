import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/credits/rewards
 *
 * Returns all configured credit reward amounts.
 *
 * Response: {
 *   rewards: {
 *     referral_recruiter: number,
 *     referral_employer: number,
 *     verification_completed: number,
 *     first_job_posted: number,
 *     first_candidate_submitted: number,
 *     monthly_active: number,
 *     profile_complete: number,
 *   }
 * }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await db.platformSetting.findMany({
      where: {
        setting_key: { startsWith: "credit_reward_" },
      },
      select: { setting_key: true, setting_value: true },
    });

    // Default rewards (used if not configured)
    const defaults: Record<string, number> = {
      referral_recruiter: 25,
      referral_employer: 50,
      verification_completed: 100,
      first_job_posted: 10,
      first_candidate_submitted: 5,
      monthly_active: 15,
      profile_complete: 10,
    };

    const rewards: Record<string, number> = { ...defaults };
    for (const s of settings) {
      const key = s.setting_key.replace("credit_reward_", "");
      rewards[key] = parseInt(s.setting_value, 10);
    }

    return NextResponse.json({ rewards }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[CREDITS_REWARDS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch reward config" }, { status: 500 });
  }
}

/**
 * PUT /api/superadmin/credits/rewards
 *
 * Update credit reward amounts.
 *
 * Body: {
 *   rewards: {
 *     referral_recruiter?: number,
 *     referral_employer?: number,
 *     verification_completed?: number,
 *     first_job_posted?: number,
 *     first_candidate_submitted?: number,
 *     monthly_active?: number,
 *     profile_complete?: number,
 *   }
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const rewards = body.rewards as Record<string, number>;

    if (!rewards || typeof rewards !== "object") {
      return NextResponse.json({ error: "rewards object is required" }, { status: 400 });
    }

    // Upsert each reward setting
    const updates = Object.entries(rewards).map(([key, value]) => {
      const numValue = parseInt(String(value), 10);
      if (isNaN(numValue) || numValue < 0 || numValue > 10000) {
        return null;
      }
      return db.platformSetting.upsert({
        where: { setting_key: `credit_reward_${key}` },
        update: { setting_value: String(numValue) },
        create: { setting_key: `credit_reward_${key}`, setting_value: String(numValue) },
      });
    }).filter(Boolean);

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[CREDITS_REWARDS_PUT]", error);
    return NextResponse.json({ error: "Failed to update reward config" }, { status: 500 });
  }
}
