import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/superadmin/companies/[id]/bundle-limit
 *   Updates the bundle slot limit for a specific organization.
 *   Super Admin only.
 *
 * Body: { bundleLimit: number }  // e.g., 10 (adds 5 more slots)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const orgId = parseInt(id);
    if (isNaN(orgId)) {
      return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const body = await request.json();
    const { bundleLimit } = body;

    if (!bundleLimit || isNaN(Number(bundleLimit)) || Number(bundleLimit) < 0) {
      return NextResponse.json(
        { error: "Valid bundleLimit is required (must be a positive number)" },
        { status: 400 }
      );
    }

    // Verify org exists
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Update or create the bundle limit setting
    const key = `bundle_limit_${orgId}`;
    await db.platformSetting.upsert({
      where: { setting_key: key },
      update: { setting_value: String(bundleLimit) },
      create: {
        setting_key: key,
        setting_value: String(bundleLimit),
      },
    });

    // Get current bundle count for context
    const currentCount = await db.complianceBundle.count({
      where: { organization_id: orgId, is_active: true },
    });

    return NextResponse.json({
      success: true,
      organizationId: orgId,
      organizationName: org.name,
      bundleLimit: Number(bundleLimit),
      currentCount,
    });
  } catch (error) {
    console.error("[BUNDLE_LIMIT_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update bundle limit" },
      { status: 500 }
    );
  }
}
