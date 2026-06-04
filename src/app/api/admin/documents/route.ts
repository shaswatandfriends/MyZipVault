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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "pending_review";

    const where: Record<string, unknown> = {};
    if (statusFilter !== "all") {
      where.verification_status = statusFilter;
    }

    const documents = await db.credential.findMany({
      where,
      select: {
        id: true,
        document_name: true,
        file_url: true,
        verification_status: true,
        review_notes: true,
        uploaded_at: true,
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { uploaded_at: "desc" },
    });

    // Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingCount, verifiedToday, rejectedToday] = await Promise.all([
      db.credential.count({ where: { verification_status: "pending_review" } }),
      db.credential.count({
        where: {
          verification_status: "verified",
          reviewed_by: { not: null },
        },
      }),
      db.credential.count({
        where: {
          verification_status: "rejected",
          reviewed_by: { not: null },
        },
      }),
    ]);

    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        documentName: d.document_name,
        fileUrl: d.file_url,
        verificationStatus: d.verification_status,
        reviewNotes: d.review_notes,
        uploadedAt: d.uploaded_at,
        candidate: {
          id: d.candidate_user.id,
          firstName: d.candidate_user.first_name,
          lastName: d.candidate_user.last_name,
          email: d.candidate_user.email,
        },
      })),
      stats: {
        pendingCount,
        verifiedToday,
        rejectedToday,
      },
    });
  } catch (error) {
    console.error("Admin Documents GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminUserId = Number(session.user.id);
    const body = await request.json();
    const { action, credentialId, reason } = body;

    if (!action || !credentialId) {
      return NextResponse.json(
        { error: "Action and credentialId are required" },
        { status: 400 }
      );
    }

    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "verify": {
        await db.credential.update({
          where: { id: credentialId },
          data: {
            verification_status: "verified",
            reviewed_by: adminUserId,
            review_notes: null,
          },
        });
        return NextResponse.json({ success: true, message: "Document verified" });
      }
      case "reject": {
        if (!reason || reason.trim() === "") {
          return NextResponse.json(
            { error: "Rejection reason is required" },
            { status: 400 }
          );
        }
        await db.credential.update({
          where: { id: credentialId },
          data: {
            verification_status: "rejected",
            reviewed_by: adminUserId,
            review_notes: reason,
          },
        });
        return NextResponse.json({ success: true, message: "Document rejected" });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin Documents POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
