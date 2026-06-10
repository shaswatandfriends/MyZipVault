import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "client_recruiter" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await db.vaultSignTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (!template.document_url) {
      return NextResponse.json(
        { error: "Template has no document" },
        { status: 404 }
      );
    }

    // Generate a signed URL (15 minutes)
    const signedUrl = await getSignedUrl(
      "vaultsign-templates",
      template.document_url,
      900
    );

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("[VAULTSIGN_TEMPLATE_PREVIEW]", error);
    return NextResponse.json(
      { error: "Failed to generate preview URL" },
      { status: 500 }
    );
  }
}
