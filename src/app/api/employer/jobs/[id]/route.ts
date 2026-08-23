import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/employer/jobs/[id] — get a single job (only if owned by this employer)
 * PUT /api/employer/jobs/[id] — update job (only if owned by this employer)
 * DELETE /api/employer/jobs/[id] — cancel job (set status='cancelled')
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = parseInt(session.user.id as string, 10);
    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const job = await db.jobPosting.findFirst({
      where: { id: jobId, posted_by_user_id: userId },
      include: { _count: { select: { submissions: true } } },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[EMPLOYER_JOB_GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = parseInt(session.user.id as string, 10);
    const { id } = await params;
    const jobId = parseInt(id, 10);

    // Verify ownership
    const existing = await db.jobPosting.findFirst({
      where: { id: jobId, posted_by_user_id: userId },
      select: { id: true, title: true },
    });
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const body = await request.json();
    const allowedFields = [
      "title", "profession", "specialty", "job_title", "employment_type",
      "city", "state", "is_remote", "salary_display", "description",
      "commission_type", "commission_amount", "commission_percentage",
      "status", "is_public", "open_date", "close_date",
    ];
    const updateData: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (f in body) {
        if (f === "state") updateData[f] = body[f] ? body[f].toUpperCase() : null;
        else if (f === "is_remote" || f === "is_public") updateData[f] = !!body[f];
        else if (f === "commission_amount" || f === "commission_percentage") {
          updateData[f] = body[f] ? parseFloat(body[f]) : null;
        } else if (f === "open_date" || f === "close_date") {
          updateData[f] = body[f] ? new Date(body[f]) : null;
        } else {
          updateData[f] = body[f];
        }
      }
    }
    if ("salary_min" in body) updateData.salary_min = body.salary_min ? parseFloat(body.salary_min) : null;
    if ("salary_max" in body) updateData.salary_max = body.salary_max ? parseFloat(body.salary_max) : null;
    if ("requirements" in body) updateData.requirements = body.requirements ? JSON.stringify(body.requirements) : null;
    if ("nice_to_have" in body) updateData.nice_to_have = body.nice_to_have ? JSON.stringify(body.nice_to_have) : null;

    const updated = await db.jobPosting.update({ where: { id: jobId }, data: updateData });

    try {
      await logAudit({ userId, role, action: "employer_updated_job", entityType: "job_posting", entityId: jobId, details: `Updated "${updated.title}"` });
    } catch (e) { console.error("[AUDIT]", e); }

    return NextResponse.json({ job: updated });
  } catch (error) {
    console.error("[EMPLOYER_JOB_UPDATE]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = parseInt(session.user.id as string, 10);
    const { id } = await params;
    const jobId = parseInt(id, 10);

    const existing = await db.jobPosting.findFirst({
      where: { id: jobId, posted_by_user_id: userId },
      select: { id: true, title: true },
    });
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const updated = await db.jobPosting.update({ where: { id: jobId }, data: { status: "cancelled" } });

    try {
      await logAudit({ userId, role, action: "employer_cancelled_job", entityType: "job_posting", entityId: jobId, details: `Cancelled "${existing.title}"` });
    } catch (e) { console.error("[AUDIT]", e); }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EMPLOYER_JOB_DELETE]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
