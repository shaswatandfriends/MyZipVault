import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/superadmin/jobs/[id]
 *   Get a single job posting (superadmin sees everything).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await db.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        posted_by: { select: { id: true, first_name: true, last_name: true, email: true } },
        organization: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[JOB_GET]", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

/**
 * PUT /api/superadmin/jobs/[id]
 *   Update a job posting (any field).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const body = await request.json();
    const adminUserId = parseInt(session.user.id as string, 10);

    // Build update data — only include fields that are present in body
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "title", "profession", "specialty", "job_title", "employment_type",
      "city", "state", "is_remote", "salary_display", "description",
      "commission_type", "commission_amount", "commission_percentage",
      "status", "is_public", "open_date", "close_date", "organization_id",
    ];
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

    const updated = await db.jobPosting.update({
      where: { id: jobId },
      data: updateData,
    });

    try {
      await logAudit({
        userId: adminUserId,
        role: userRole,
        action: "job_posting_updated",
        entityType: "job_posting",
        entityId: jobId,
        details: `Updated job "${updated.title}" — fields: ${Object.keys(updateData).join(", ")}`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log job update:", auditErr);
    }

    return NextResponse.json({ job: updated });
  } catch (error) {
    console.error("[JOB_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

/**
 * DELETE /api/superadmin/jobs/[id]
 *   Soft-delete a job by setting status='cancelled'. Hard delete is not allowed
 *   (audit trail). Recruiters who already submitted to this job keep their records.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const adminUserId = parseInt(session.user.id as string, 10);
    const job = await db.jobPosting.findUnique({ where: { id: jobId }, select: { title: true, status: true } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Cancel instead of delete (audit trail)
    const updated = await db.jobPosting.update({
      where: { id: jobId },
      data: { status: "cancelled" },
    });

    try {
      await logAudit({
        userId: adminUserId,
        role: userRole,
        action: "job_posting_cancelled",
        entityType: "job_posting",
        entityId: jobId,
        details: `Cancelled job "${job.title}"`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log job cancellation:", auditErr);
    }

    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error("[JOB_DELETE]", error);
    return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
  }
}
