import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const checklist_template_id = searchParams.get("checklist_template_id");

    const where: Record<string, unknown> = {};
    if (checklist_template_id) {
      where.checklist_template_id = parseInt(checklist_template_id);
    }

    const skills = await db.skill.findMany({
      where,
      orderBy: { sort_order: "asc" },
      include: {
        checklist_template: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ skills });
  } catch (error) {
    console.error("[ADMIN_SKILLS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch skills" },
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
    const { checklist_template_id, skill_name, category, question_type, sort_order, has_na_option } = body;

    if (!checklist_template_id || !skill_name || !category || !question_type || sort_order === undefined) {
      return NextResponse.json(
        { error: "Checklist template ID, skill name, category, question type, and sort order are required" },
        { status: 400 }
      );
    }

    const skill = await db.skill.create({
      data: {
        checklist_template_id,
        skill_name,
        category,
        question_type,
        sort_order,
        has_na_option: has_na_option ?? true,
      },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_SKILLS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 }
    );
  }
}
