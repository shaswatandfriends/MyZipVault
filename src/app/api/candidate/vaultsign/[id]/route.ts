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

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const docId = parseInt(id, 10);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const doc = await db.vaultSignDocument.findUnique({
      where: { id: docId },
      include: {
        signers: {
          orderBy: { signing_order_position: "asc" },
        },
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            organization: {
              select: { name: true },
            },
          },
        },
        template: {
          select: { id: true, name: true },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify this candidate is a signer on this document
    const mySigner = doc.signers.find(
      (s) => s.user_id === userId || s.email === user.email
    );

    if (!mySigner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate signed URL for document preview (if available)
    let documentUrl: string | null = null;
    if (doc.original_document_url) {
      try {
        documentUrl = await getSignedUrl(
          "vaultsign-documents",
          doc.original_document_url,
          900
        );
      } catch {
        // If storage URL generation fails, return null
      }
    }

    let finalDocumentUrl: string | null = null;
    if (doc.final_document_url && doc.status === "completed") {
      try {
        finalDocumentUrl = await getSignedUrl(
          "vaultsign-documents",
          doc.final_document_url,
          900
        );
      } catch {
        // If storage URL generation fails, return null
      }
    }

    // Parse audit trail
    let auditEvents: any[] = [];
    try {
      auditEvents = JSON.parse(doc.audit_trail || "[]");
    } catch {
      auditEvents = [];
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        document_name: doc.document_name,
        document_type: doc.document_type,
        status: doc.status,
        signing_order: doc.signing_order,
        expiry_date: doc.expiry_date,
        personal_message: doc.personal_message,
        created_at: doc.created_at,
        document_url: documentUrl,
        final_document_url: finalDocumentUrl,
        my_signer: {
          id: mySigner.id,
          name: mySigner.name,
          email: mySigner.email,
          role: mySigner.role,
          status: mySigner.status,
          signed_at: mySigner.signed_at,
          declined_at: mySigner.declined_at,
          decline_reason: mySigner.decline_reason,
          sign_token: mySigner.sign_token,
        },
        signers: doc.signers.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          party_number: s.party_number,
          status: s.status,
          signed_at: s.signed_at,
          declined_at: s.declined_at,
        })),
        creator: doc.creator
          ? {
              name: `${doc.creator.first_name || ""} ${doc.creator.last_name || ""}`.trim(),
              email: doc.creator.email,
              organization: (doc.creator as any).organization?.name || null,
            }
          : null,
        template: doc.template,
        audit_trail: auditEvents,
      },
    });
  } catch (error) {
    console.error("[CANDIDATE_VAULTSIGN_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
