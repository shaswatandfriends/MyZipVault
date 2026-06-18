import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/verify-document?documentId=MZV-XXX&verificationCode=XXXXXXXX
 * Public endpoint — anyone can verify a document's authenticity.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId")?.trim();
    const verificationCode = searchParams.get("verificationCode")?.trim();

    if (!documentId || !verificationCode) {
      return NextResponse.json(
        { error: "Both documentId and verificationCode are required." },
        { status: 400 }
      );
    }

    const record = await db.documentVerification.findUnique({
      where: { document_id: documentId },
    });

    if (!record) {
      return NextResponse.json(
        {
          valid: false,
          reason: "Document not found. Please check the Document ID and try again.",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    if (record.verification_code !== verificationCode) {
      return NextResponse.json(
        {
          valid: false,
          reason: "Verification code does not match. Please check and try again.",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    if (record.status === "voided") {
      return NextResponse.json(
        {
          valid: false,
          reason: "This document has been voided and is no longer valid.",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    if (record.status === "expired") {
      return NextResponse.json(
        {
          valid: false,
          reason: "This document has expired and is no longer valid.",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Increment verification count
    await db.documentVerification.update({
      where: { id: record.id },
      data: {
        verified_count: { increment: 1 },
        last_verified_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        valid: true,
        documentId: record.document_id,
        documentType: record.document_type,
        documentName: record.document_name,
        candidateName: record.candidate_name,
        signedAt: record.signed_at?.toISOString() || null,
        status: record.status,
        verifiedCount: record.verified_count + 1,
        message: "This document has been verified as authentic.",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[VERIFY_DOCUMENT]", error);
    return NextResponse.json(
      { error: "Failed to verify document" },
      { status: 500 }
    );
  }
}
