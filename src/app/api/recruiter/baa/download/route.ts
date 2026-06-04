import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedUrl, STORAGE_BUCKETS } from "@/lib/storage";

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

    // Get organization BAA document URL
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        baa_status: true,
        baa_document_url: true,
      },
    });

    if (!organization || organization.baa_status !== "signed") {
      return NextResponse.json(
        { error: "BAA has not been signed yet" },
        { status: 400 }
      );
    }

    if (!organization.baa_document_url) {
      return NextResponse.json(
        { error: "BAA document is not available for download" },
        { status: 404 }
      );
    }

    // Generate a signed URL with 15-minute expiry
    const signedUrl = await getSignedUrl(
      STORAGE_BUCKETS.BAA,
      organization.baa_document_url,
      900 // 15 minutes
    );

    // If it's a base64 data URL, return it as a JSON response so the frontend
    // can open it in a new tab or convert to a download
    if (signedUrl.startsWith("data:")) {
      return NextResponse.json({ url: signedUrl, isBase64: true });
    }

    // Redirect to the signed URL for Supabase-hosted files
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("BAA download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }
}
