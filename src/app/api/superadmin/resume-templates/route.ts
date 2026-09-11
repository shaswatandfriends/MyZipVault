import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/resume-templates
 *
 * List all resume templates. Optional ?active=true to filter to active only.
 *
 * Auth: super_admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const templates = await db.resumeTemplate.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { id: "asc" },
      include: {
        updater: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("[RESUME_TEMPLATES_LIST]", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/resume-templates
 *
 * Create a new resume template.
 * Body: { name, description?, layout_config, is_active? }
 *
 * Auth: super_admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);

    const body = await request.json();
    const { name, description, layout_config, is_active } = body;

    if (!name || !layout_config) {
      return NextResponse.json(
        { error: "name and layout_config are required" },
        { status: 400 }
      );
    }

    const template = await db.resumeTemplate.create({
      data: {
        name,
        description: description || null,
        layout_config: typeof layout_config === "string" ? JSON.parse(layout_config) : layout_config,
        is_active: is_active !== undefined ? !!is_active : true,
        updated_by: userId,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error("[RESUME_TEMPLATES_CREATE]", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
