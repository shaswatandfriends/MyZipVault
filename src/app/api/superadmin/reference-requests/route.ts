import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/superadmin/reference-requests — List all reference deletion requests
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";

    const where: Record<string, unknown> = {};
    if (statusFilter !== "all") {
      where.status = statusFilter;
    }

    const requests = await db.referenceDeletionRequest.findMany({
      where,
      include: {
        candidate_user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            candidate_profile: {
              select: { first_name: true, last_name: true, phone: true },
            },
          },
        },
        reference: {
          select: {
            id: true,
            manager_email: true,
            manager_phone: true,
            facility_name: true,
            employment_status: true,
            status: true,
            manager_user: {
              select: { first_name: true, last_name: true },
            },
            reference_responses: {
              select: { id: true },
            },
          },
        },
        reviewer: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const stats = {
      pending: await db.referenceDeletionRequest.count({ where: { status: "pending" } }),
      approved: await db.referenceDeletionRequest.count({ where: { status: "approved" } }),
      rejected: await db.referenceDeletionRequest.count({ where: { status: "rejected" } }),
      total: await db.referenceDeletionRequest.count(),
    };

    return NextResponse.json({ requests, stats });
  } catch (error) {
    console.error("Superadmin reference requests GET error:", error);
    return NextResponse.json({ error: "Failed to fetch reference requests" }, { status: 500 });
  }
}
