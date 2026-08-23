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

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pipelineStage = searchParams.get("pipelineStage");
    const search = searchParams.get("search");
    const source = searchParams.get("source");

    const where: Record<string, unknown> = {
      recruiter_user_id: userId,
      is_active: true,
    };

    if (pipelineStage) {
      where.pipeline_stage = pipelineStage;
    }

    if (source) {
      where.source = source;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { job_title: { contains: search } },
        { specialty: { contains: search } },
      ];
    }

    const leads = await db.recruiterLead.findMany({
      where,
      include: {
        call_schedules: {
          orderBy: { created_at: "desc" },
        },
        call_logs: {
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_LEADS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
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

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      specialty,
      reachedFor,
      remark,
      source,
      pipelineStage,
      starRating,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const lead = await db.recruiterLead.create({
      data: {
        recruiter_user_id: userId,
        organization_id: organizationId,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        job_title: jobTitle || null,
        specialty: specialty || null,
        reached_for: reachedFor || null,
        remark: remark || null,
        source: source || "cold_call",
        pipeline_stage: pipelineStage || "new_lead",
        star_rating: starRating || null,
      },
      include: {
        call_schedules: true,
        call_logs: true,
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("[RECRUITER_CALENDAR_LEADS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
