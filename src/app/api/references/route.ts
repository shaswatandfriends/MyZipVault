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
      const references = await db.candidateReference.findMany({
        where: { candidate_user_id: userId },
        include: {
          manager_user: {
            select: { first_name: true, last_name: true },
          },
          reference_responses: {
            include: {
              question: {
                select: { question_text: true },
              },
            },
          },
        },
        orderBy: { requested_at: "desc" },
      });

      return NextResponse.json({ references });
    }

    return NextResponse.json({ references: [] });
  } catch (error) {
    console.error("References GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch references" },
      { status: 500 }
    );
  }
}
