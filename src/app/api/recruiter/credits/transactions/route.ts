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

    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organization_id: organizationId,
    };

    if (type) {
      where.transaction_type = type;
    }

    const [transactions, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      db.creditTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[RECRUITER_CREDITS_TRANSACTIONS]", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
