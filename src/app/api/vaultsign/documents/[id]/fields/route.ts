import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

// PUT: Update sign fields for a document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.status !== "draft") {
      return NextResponse.json({ error: "Only draft documents can be modified" }, { status: 400 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { sign_fields, signers, show_header_footer } = body;

    const updateData: any = { updated_at: new Date() };

    if (sign_fields !== undefined) {
      updateData.sign_fields = typeof sign_fields === "string" ? sign_fields : JSON.stringify(sign_fields);
    }

    if (show_header_footer !== undefined) {
      updateData.show_header_footer = show_header_footer;
    }

    await db.vaultSignDocument.update({
      where: { id: docId },
      data: updateData,
    });

    // Update signers if provided
    if (signers && Array.isArray(signers)) {
      for (const signer of signers) {
        if (signer.id) {
          await db.vaultSignSigner.update({
            where: { id: signer.id },
            data: {
              name: signer.name,
              email: signer.email,
              role: signer.role,
              signer_index: signer.signer_index,
              signing_order_position: signer.signing_order_position,
            },
          });
        }
      }
    }

    // Add new signers (those without id)
    const newSigners = (signers || []).filter((s: any) => !s.id);
    if (newSigners.length > 0) {
      await db.vaultSignSigner.createMany({
        data: newSigners.map((signer: any) => ({
          document_id: docId,
          user_id: signer.user_id || null,
          name: signer.name,
          email: signer.email,
          role: signer.role || "Candidate",
          signer_index: signer.signer_index,
          signing_order_position: signer.signing_order_position || 1,
          status: "pending",
          sign_token: crypto.randomBytes(32).toString("hex"),
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN] Update fields error:", error);
    return NextResponse.json({ error: "Failed to update fields" }, { status: 500 });
  }
}
