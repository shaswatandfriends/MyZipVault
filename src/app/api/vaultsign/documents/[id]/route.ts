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
    if (userRole !== "client_recruiter" && userRole !== "client_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizationId = (session.user as Record<string, unknown>).organizationId as number;
    const { id } = await params;
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
      include: {
        signers: {
          orderBy: { signing_order_position: "asc" },
        },
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        template: {
          select: { id: true, name: true, document_type: true, document_url: true },
        },
        revised_from_document: {
          select: { id: true, document_name: true },
        },
        revised_documents: {
          select: { id: true, document_name: true, status: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check organization access
    if (document.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate signed URL for the document if it has a URL
    let documentUrl: string | null = null;
    if (document.original_document_url) {
      documentUrl = await getSignedUrl(
        "vaultsign-documents",
        document.original_document_url,
        900
      );
    }

    let finalUrl: string | null = null;
    if (document.final_document_url) {
      finalUrl = await getSignedUrl(
        "vaultsign-documents",
        document.final_document_url,
        900
      );
    }

    return NextResponse.json({
      document: {
        ...document,
        original_document_url: documentUrl,
        final_document_url: finalUrl,
      },
    });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
