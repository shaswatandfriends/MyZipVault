import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const documentType = searchParams.get("document_type");
    const search = searchParams.get("search");

    // Find all VaultSignSigner records where this user is a signer (matched by user_id)
    // Also find by email match (for signers not yet linked to a user account)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build where clause for documents this candidate is a signer on
    const where: Prisma.VaultSignDocumentWhereInput = {
      signers: {
        some: {
          OR: [
            { user_id: userId },
            { email: user.email },
          ],
        },
      },
    };

    if (status) {
      where.status = status;
    }
    if (documentType) {
      where.document_type = documentType;
    }
    if (search) {
      where.document_name = { contains: search, mode: "insensitive" };
    }

    const documents = await db.vaultSignDocument.findMany({
      where,
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
      orderBy: { created_at: "desc" },
    });

    // Compute stats
    const allSignerDocs = await db.vaultSignSigner.findMany({
      where: {
        OR: [
          { user_id: userId },
          { email: user.email },
        ],
      },
      include: {
        document: {
          select: { status: true, expiry_date: true },
        },
      },
    });

    const pending = allSignerDocs.filter(
      (s) => s.status === "sent" || s.status === "viewed" || s.status === "pending"
    ).length;
    const signed = allSignerDocs.filter((s) => s.status === "signed").length;
    const declined = allSignerDocs.filter((s) => s.status === "declined").length;
    const expiringSoon = allSignerDocs.filter((s) => {
      if (s.status === "signed" || s.status === "declined") return false;
      const diff = (new Date(s.document.expiry_date).getTime() - Date.now()) / 86400000;
      return diff > 0 && diff <= 7;
    }).length;

    // Enrich documents with candidate's signer-specific info
    const enrichedDocs = documents.map((doc) => {
      const mySigner = doc.signers.find(
        (s) => s.user_id === userId || s.email === user.email
      );
      return {
        id: doc.id,
        document_name: doc.document_name,
        document_type: doc.document_type,
        status: doc.status,
        signing_order: doc.signing_order,
        expiry_date: doc.expiry_date,
        personal_message: doc.personal_message,
        created_at: doc.created_at,
        final_document_url: doc.final_document_url,
        my_signer: mySigner
          ? {
              id: mySigner.id,
              status: mySigner.status,
              signed_at: mySigner.signed_at,
              declined_at: mySigner.declined_at,
              decline_reason: mySigner.decline_reason,
              sign_token: mySigner.sign_token,
              role: mySigner.role,
            }
          : null,
        creator: doc.creator
          ? {
              name: `${doc.creator.first_name || ""} ${doc.creator.last_name || ""}`.trim(),
              email: doc.creator.email,
              organization: (doc.creator as any).organization?.name || null,
            }
          : null,
        total_signers: doc.signers.length,
        signed_count: doc.signers.filter((s) => s.status === "signed").length,
        other_signers: doc.signers
          .filter((s) => s.user_id !== userId && s.email !== user.email)
          .map((s) => ({
            name: s.name,
            status: s.status,
            role: s.role,
          })),
      };
    });

    return NextResponse.json({
      documents: enrichedDocs,
      stats: {
        pending,
        signed,
        declined,
        expiring_soon: expiringSoon,
      },
    });
  } catch (error) {
    console.error("[CANDIDATE_VAULTSIGN_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
