import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await db.checklistTemplate.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { skills: true } },
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[ADMIN_CHECKLIST_TEMPLATES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { profession, specialty, name, is_active } = body;

    if (!profession || !specialty || !name) {
      return NextResponse.json(
        { error: "Profession, specialty, and name are required" },
        { status: 400 }
      );
    }

    const template = await db.checklistTemplate.create({
      data: {
        profession,
        specialty,
        name,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_CHECKLIST_TEMPLATES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create checklist template" },
      { status: 500 }
    );
  }
}
