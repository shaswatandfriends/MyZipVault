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

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { credits_balance: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ balance: org.credits_balance });
  } catch (error) {
    console.error("[RECRUITER_CREDITS_BALANCE]", error);
    return NextResponse.json(
      { error: "Failed to fetch credit balance" },
      { status: 500 }
    );
  }
}
