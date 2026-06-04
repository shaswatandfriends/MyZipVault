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

    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const invoices = await db.invoice.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[RECRUITER_CREDITS_INVOICES]", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
