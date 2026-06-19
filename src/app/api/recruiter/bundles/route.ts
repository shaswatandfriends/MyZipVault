import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { bundleCreateSchema, validateBody } from "@/lib/validation-schemas";

/**
 * Default number of free bundle slots per organization.
 * Super Admin can override via platform_settings key 'bundle_limit_<org_id>'.
 */
const DEFAULT_BUNDLE_LIMIT = 5;

/**
 * GET /api/recruiter/bundles
 *   Returns all active compliance bundles for the recruiter's organization.
 *   Also returns the org's bundle limit and current count.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const bundles = await db.complianceBundle.findMany({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
      include: {
        checklist_template: {
          select: { id: true, name: true, profession: true, specialty: true },
        },
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Get bundle limit for this org
    const limitSetting = await db.platformSetting.findUnique({
      where: { setting_key: `bundle_limit_${organizationId}` },
    });
    const bundleLimit = limitSetting
      ? parseInt(limitSetting.setting_value, 10)
      : DEFAULT_BUNDLE_LIMIT;

    return NextResponse.json({
      bundles,
      bundleLimit,
      bundleCount: bundles.length,
      canCreateMore: bundles.length < bundleLimit,
    });
  } catch (error) {
    console.error("[BUNDLES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch bundles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recruiter/bundles
 *   Creates a new compliance bundle (client_admin only).
 *   Checks bundle limit before creating.
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   profession?: string,
 *   specialty?: string,
 *   checklistTemplateId: number,
 *   documents: string[]  // ["credential", "resume", "reference"]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (userRole !== "client_admin") {
      return NextResponse.json(
        { error: "Only agency admins can create bundles" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();

    // ─── Zod validation ───
    const validation = validateBody(bundleCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { name, description, profession, specialty, checklistTemplateId, documents: safeDocuments } = validation.data;

    // Verify checklist template exists and is active
    const template = await db.checklistTemplate.findFirst({
      where: { id: checklistTemplateId, is_active: true },
    });
    if (!template) {
      return NextResponse.json({ error: "Invalid checklist template" }, { status: 400 });
    }

    // Check bundle limit
    const currentCount = await db.complianceBundle.count({
      where: { organization_id: organizationId, is_active: true },
    });

    const limitSetting = await db.platformSetting.findUnique({
      where: { setting_key: `bundle_limit_${organizationId}` },
    });
    const bundleLimit = limitSetting
      ? parseInt(limitSetting.setting_value, 10)
      : DEFAULT_BUNDLE_LIMIT;

    if (currentCount >= bundleLimit) {
      return NextResponse.json(
        {
          error: `Bundle limit reached (${bundleLimit}). Delete an existing bundle to create a new one, or contact MyZipVault to purchase additional bundle slots.`,
          code: "BUNDLE_LIMIT_REACHED",
          currentCount,
          bundleLimit,
        },
        { status: 403 }
      );
    }

    // Calculate credit cost: 1 (checklist request) + documents.length
    const creditCost = 1 + safeDocuments.length;

    const bundle = await db.complianceBundle.create({
      data: {
        organization_id: organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        profession: profession?.trim() || null,
        specialty: specialty?.trim() || null,
        checklist_template_id: Number(checklistTemplateId),
        documents: JSON.stringify(safeDocuments),
        credit_cost: creditCost,
        is_active: true,
        created_by: userId,
      },
      include: {
        checklist_template: {
          select: { id: true, name: true, profession: true, specialty: true },
        },
      },
    });

    return NextResponse.json({ bundle }, { status: 201 });
  } catch (error) {
    console.error("[BUNDLES_CREATE]", error);
    return NextResponse.json(
      { error: "Failed to create bundle" },
      { status: 500 }
    );
  }
}
