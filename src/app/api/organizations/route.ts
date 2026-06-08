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
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["super_admin", "platform_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    const where = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};

    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where,
        include: {
          users: { select: { id: true, role: true } },
          _count: { select: { users: true, credit_transactions: true, invoices: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.organization.count({ where }),
    ]);

    return NextResponse.json({ organizations, total, page, limit });
  } catch (error) {
    console.error("[ORGANIZATIONS_GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, credits_balance, seat_limit, custom_pricing_notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const organization = await db.organization.create({
      data: {
        name: name.trim(),
        credits_balance: credits_balance ?? 0,
        seat_limit: seat_limit ?? 5,
        custom_pricing_notes: custom_pricing_notes || null,
      },
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error("[ORGANIZATIONS_POST] Error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
