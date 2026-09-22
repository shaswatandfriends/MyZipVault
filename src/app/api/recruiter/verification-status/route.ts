import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/verification-status
 *
 * Returns the recruiter's verification status + certification tags.
 * Used by the /recruiter/verification page.
 *
 * Response: {
 *   verification_status: string,  // unverified|pending|verified|failed|cooldown
 *   verification_completed_at: string | null,
 *   verification_expires_at: string | null,
 *   verification_failed_at: string | null,
 *   certification_tags: string[]  // ['allied','nursing','locums','non_clinical']
 * }
 *
 * The verification process itself happens on an EXTERNAL portal
 * (https://verify.myzipvault.com). This endpoint just reads the status
 * that was set by the external portal via the webhook
 * (POST /api/recruiter/verification-webhook).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        verification_status: true,
        verification_completed_at: true,
        verification_expires_at: true,
        verification_failed_at: true,
        certification_tags: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse certification_tags from JSON string to array
    let tags: string[] = [];
    try {
      tags = JSON.parse(user.certification_tags || "[]");
    } catch {
      tags = [];
    }

    return NextResponse.json({
      verification_status: user.verification_status,
      verification_completed_at: user.verification_completed_at,
      verification_expires_at: user.verification_expires_at,
      verification_failed_at: user.verification_failed_at,
      certification_tags: tags,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[VERIFICATION_STATUS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch verification status" }, { status: 500 });
  }
}
