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
      select: {
        baa_status: true,
        baa_document_url: true,
        baa_signed_by_name: true,
        baa_signed_by_title: true,
        baa_signed_at: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error("[RECRUITER_BAA_STATUS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch BAA status" },
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

    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { signerName, signerTitle, agreed } = body;

    if (!signerName || !signerTitle || !agreed) {
      return NextResponse.json(
        { error: "Signer name, title, and agreement are required" },
        { status: 400 }
      );
    }

    await db.organization.update({
      where: { id: organizationId },
      data: {
        baa_status: "signed",
        baa_signed_by_name: signerName,
        baa_signed_by_title: signerTitle,
        baa_signed_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RECRUITER_BAA_STATUS_POST]", error);
    return NextResponse.json(
      { error: "Failed to sign BAA" },
      { status: 500 }
    );
  }
}
