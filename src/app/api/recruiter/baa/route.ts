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

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Get BAA settings
    const baaRequiredSetting = await db.platformSetting.findUnique({
      where: { setting_key: "baa_required" },
    });
    const baaContentSetting = await db.platformSetting.findUnique({
      where: { setting_key: "baa_content" },
    });

    const baaRequired = baaRequiredSetting?.setting_value === "true";
    const baaContent = baaContentSetting?.setting_value ?? "";

    // Get organization BAA status
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        baa_status: true,
        baa_signed_by_name: true,
        baa_signed_by_title: true,
        baa_signed_at: true,
      },
    });

    return NextResponse.json({
      baaRequired,
      baaContent,
      organization: {
        name: organization?.name ?? "",
        baaStatus: organization?.baa_status ?? "pending",
        signedByName: organization?.baa_signed_by_name ?? null,
        signedByTitle: organization?.baa_signed_by_title ?? null,
        signedAt: organization?.baa_signed_at ?? null,
      },
    });
  } catch (error) {
    console.error("BAA GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch BAA data" },
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
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (userRole !== "client_admin") {
      return NextResponse.json({ error: "Only admin can sign the BAA" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { fullName, title, agreed } = body;

    if (!fullName || !title || !agreed) {
      return NextResponse.json(
        { error: "Full name, title, and agreement are required" },
        { status: 400 }
      );
    }

    // Update organization BAA status
    await db.organization.update({
      where: { id: organizationId },
      data: {
        baa_status: "signed",
        baa_signed_by_name: fullName,
        baa_signed_by_title: title,
        baa_signed_at: new Date(),
      },
    });

    // Create audit log
    const userId = Number(session.user.id);
    await db.auditLog.create({
      data: {
        user_id: userId,
        role: userRole,
        action: "baa_signed",
        entity_type: "organization",
        entity_id: organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "BAA signed successfully",
    });
  } catch (error) {
    console.error("BAA POST error:", error);
    return NextResponse.json(
      { error: "Failed to sign BAA" },
      { status: 500 }
    );
  }
}
