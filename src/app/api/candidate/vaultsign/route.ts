import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List documents where candidate is a signer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "candidate") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const userId = parseInt(session.user.id);

    // Find all signers for this user
    const signers = await db.vaultSignSigner.findMany({
      where: { user_id: userId },
      include: {
        document: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Also find signers by email match (for external signers)
    const emailSigners = await db.vaultSignSigner.findMany({
      where: {
        email: session.user.email,
        user_id: null,
      },
      include: {
        document: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Combine and deduplicate
    const allSigners = [...signers, ...emailSigners];
    const seen = new Set<number>();
    const unique = allSigners.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    const documents = unique.map((signer) => ({
      signer_id: signer.id,
      signer_status: signer.status,
      signer_role: signer.role,
      signed_at: signer.signed_at,
      declined_at: signer.declined_at,
      sign_token: signer.sign_token,
      document: {
        id: signer.document.id,
        document_name: signer.document.document_name,
        document_type: signer.document.document_type,
        status: signer.document.status,
        expiry_date: signer.document.expiry_date,
        created_at: signer.document.created_at,
        organization: signer.document.organization,
      },
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[VAULTSIGN] Candidate list error:", error);
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}
