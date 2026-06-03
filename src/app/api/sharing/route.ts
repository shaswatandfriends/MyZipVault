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

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole === "candidate") {
      const shareRequests = await db.shareRequest.findMany({
        where: { candidate_user_id: userId },
        include: {
          client_user: {
            select: {
              first_name: true,
              last_name: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      const activeShares = await db.consentShare.findMany({
        where: {
          candidate_user_id: userId,
          is_deleted: false,
        },
        include: {
          client_user: {
            select: {
              first_name: true,
              last_name: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { shared_at: "desc" },
      });

      return NextResponse.json({ shareRequests, activeShares });
    }

    return NextResponse.json({ shareRequests: [], activeShares: [] });
  } catch (error) {
    console.error("Sharing GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sharing data" },
      { status: 500 }
    );
  }
}
