import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/recruiter/verification-webhook
 *
 * Webhook called by the EXTERNAL verification portal to update a
 * recruiter's verification status.
 *
 * Authentication: Bearer token in Authorization header must match
 * VERIFICATION_WEBHOOK_SECRET env var.
 *
 * Body: {
 *   user_id: number,           // the recruiter's user ID
 *   status: string,            // 'verified' | 'failed' | 'pending'
 *   certification_tags?: string[],  // ['allied','nursing','locums','non_clinical']
 *   expires_at?: string,       // ISO date (1 year from now)
 * }
 *
 * Behavior:
 *   - status='verified' → sets verification_status='verified',
 *     verification_completed_at=NOW(), verification_expires_at=expires_at
 *     (or NOW + 1 year), certification_tags from body
 *   - status='failed' → sets verification_status='failed',
 *     verification_failed_at=NOW() (triggers 45-day cooldown)
 *   - status='pending' → sets verification_status='pending'
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.VERIFICATION_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error("[VERIFICATION_WEBHOOK] VERIFICATION_WEBHOOK_SECRET not set");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, status, certification_tags, expires_at } = body;

    if (!user_id || !status) {
      return NextResponse.json({ error: "user_id and status are required" }, { status: 400 });
    }

    if (!["verified", "failed", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: Number(user_id) },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!["client_recruiter", "client_admin"].includes(user.role)) {
      return NextResponse.json({ error: "User is not a recruiter" }, { status: 400 });
    }

    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (status === "verified") {
      await db.user.update({
        where: { id: user.id },
        data: {
          verification_status: "verified",
          verification_completed_at: now,
          verification_expires_at: expires_at ? new Date(expires_at) : oneYearFromNow,
          certification_tags: certification_tags ? JSON.stringify(certification_tags) : "[]",
        },
      });

      // Grant 100 credits (or configured amount) for completing verification
      try {
        const { grantVerificationReward } = await import("@/lib/reward-grants");
        await grantVerificationReward(user.id);
      } catch (rewardErr) {
        console.error("[VERIFICATION_WEBHOOK] Failed to grant reward:", rewardErr);
        // Non-blocking — verification still succeeds
      }
    } else if (status === "failed") {
      await db.user.update({
        where: { id: user.id },
        data: {
          verification_status: "failed",
          verification_failed_at: now,
        },
      });
    } else {
      // pending
      await db.user.update({
        where: { id: user.id },
        data: {
          verification_status: "pending",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[VERIFICATION_WEBHOOK]", error);
    return NextResponse.json({ error: "Failed to update verification status" }, { status: 500 });
  }
}
