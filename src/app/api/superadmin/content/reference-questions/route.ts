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
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employment_status = searchParams.get("employment_status") || undefined;

    const where: Record<string, unknown> = {};
    if (employment_status) {
      where.employment_status = employment_status;
    }

    const questions = await db.referenceQuestion.findMany({
      where,
      orderBy: { sort_order: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_QUESTIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference questions" },
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
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { employment_status, question_text, response_type, sort_order } = body;

    if (!employment_status || !question_text || !response_type || sort_order === undefined) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const question = await db.referenceQuestion.create({
      data: {
        employment_status,
        question_text,
        response_type,
        sort_order,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_QUESTIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create reference question" },
      { status: 500 }
    );
  }
}
