import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCreditAccess } from "@/lib/credit-gating";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { featureName } = body as { featureName?: string };

    if (!featureName || typeof featureName !== "string") {
      return NextResponse.json(
        { error: "featureName is required" },
        { status: 400 }
      );
    }

    const result = await checkCreditAccess(organizationId, featureName);

    if (!result.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          creditsRequired: result.creditsRequired,
          currentBalance: result.currentBalance,
          message: result.reason || "Insufficient credits",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
      creditsRequired: result.creditsRequired,
      currentBalance: result.currentBalance,
    });
  } catch (error) {
    console.error("[CREDIT_GATE]", error);
    return NextResponse.json(
      { error: "Failed to check credit access" },
      { status: 500 }
    );
  }
}
