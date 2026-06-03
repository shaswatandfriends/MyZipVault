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
      const credentials = await db.credential.findMany({
        where: { candidate_user_id: userId },
        orderBy: { uploaded_at: "desc" },
      });

      // Recalculate status based on current date
      const updatedCredentials = credentials.map((c) => {
        let status = c.status;
        if (c.expiration_date) {
          const expDate = new Date(c.expiration_date);
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (expDate < now) {
            status = "expired";
          } else if (expDate <= thirtyDaysFromNow) {
            status = "expiring_soon";
          } else {
            status = "active";
          }
        } else {
          status = "active";
        }
        return { ...c, status };
      });

      return NextResponse.json({ credentials: updatedCredentials });
    }

    return NextResponse.json({ credentials: [] });
  } catch (error) {
    console.error("Credentials GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: "Credential upload endpoint", data: body }, { status: 201 });
}
