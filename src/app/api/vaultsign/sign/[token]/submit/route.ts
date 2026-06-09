import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { generateSignedPdf, computeDocumentHash } from "@/lib/pdf-sign";
import { uploadFile } from "@/lib/storage";
import { getSignedUrl } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find signer by sign_token
    const signer = await db.vaultSignSigner.findUnique({
      where: { sign_token: token },
      include: {
        document: {
          include: {
            signers: {
              orderBy: { signing_order_position: "asc" },
            },
            creator: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json(
        { error: "Invalid signing token" },
        { status: 404 }
      );
    }

    const doc = signer.document;

    // Check signer hasn't already signed
    if (signer.status === "signed") {
      return NextResponse.json(
        { error: "You have already signed this document" },
        { status: 400 }
      );
    }

    if (signer.status === "declined") {
      return NextResponse.json(
        { error: "You have already declined this document" },
        { status: 400 }
      );
    }

    // Check document status
    if (doc.status === "expired" || doc.status === "voided" || doc.status === "declined" || doc.status === "completed") {
      return NextResponse.json(
        { error: "This document can no longer be signed" },
        { status: 400 }
      );
    }

    // If sequential, verify it's this signer's turn
    if (doc.signing_order === "sequential") {
      const previousSigners = doc.signers.filter(
        (s) => s.signing_order_position < signer.signing_order_position
      );
      const unsignedPrevious = previousSigners.filter(
        (s) => s.status !== "signed"
      );
      if (unsignedPrevious.length > 0) {
        return NextResponse.json(
          { error: "It is not your turn to sign yet" },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const { field_values, signature_data, all_signatures, consent_agreed } = body;

    // Validate required fields
    if (!consent_agreed) {
      return NextResponse.json(
        { error: "You must agree to the consent terms" },
        { status: 400 }
      );
    }

    // Support both single signature_data and per-field all_signatures
    const hasSignature = signature_data || (all_signatures && Object.keys(all_signatures).length > 0);
    if (!hasSignature) {
      return NextResponse.json(
        { error: "Signature data is required" },
        { status: 400 }
      );
    }

    // Merge per-field signatures into field values for proper PDF generation
    // If all_signatures is provided, use it; otherwise fall back to single signature_data
    const perFieldSignatures: Record<string, any> = all_signatures || {};
    if (signature_data && Object.keys(perFieldSignatures).length === 0) {
      // Legacy: single signature for all signature fields
      const sigFields = allSignFields.filter(
        (f: Record<string, unknown>) =>
          f.assigned_to_signer_id === signerPartyId &&
          f.type === "signature"
      );
      sigFields.forEach((f: Record<string, unknown>) => {
        perFieldSignatures[f.id as string] = signature_data;
      });
    }

    if (!field_values || !Array.isArray(field_values)) {
      return NextResponse.json(
        { error: "Field values are required" },
        { status: 400 }
      );
    }

    // Validate all required fields are filled
    const allSignFields = JSON.parse(doc.sign_fields || "[]");
    // Fields are assigned using party-based IDs (e.g. "party_2") or numeric signer IDs
    const signerPartyId = `party_${signer.party_number}`;
    const signerFields = allSignFields.filter(
      (f: Record<string, unknown>) =>
        f.assigned_to_signer_id === signerPartyId ||
        f.assigned_to_signer_id === String(signer.id) ||
        f.assigned_to_signer_id === signer.id
    );

    for (const field of signerFields) {
      if (field.required) {
        const fieldValue = field_values.find(
          (fv: Record<string, unknown>) => fv.field_id === field.id
        );
        if (!fieldValue || !fieldValue.value) {
          return NextResponse.json(
            { error: `Required field "${field.label}" is missing` },
            { status: 400 }
          );
        }
      }
    }

    // Get IP address and device info from request
    const ip_address =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const device_info = request.headers.get("user-agent") || null;

    // Update signer with signature data (store per-field signatures for accurate PDF generation)
    await db.vaultSignSigner.update({
      where: { id: signer.id },
      data: {
        status: "signed",
        signed_at: new Date(),
        ip_address,
        device_info,
        signature_data: JSON.stringify({
          primary: signature_data,
          per_field: perFieldSignatures,
        }),
        token_used: true,
        updated_at: new Date(),
      },
    });

    // Update sign_fields values in the document
    for (const fv of field_values) {
      const fieldIndex = allSignFields.findIndex(
        (f: Record<string, unknown>) => f.id === fv.field_id
      );
      if (fieldIndex >= 0) {
        allSignFields[fieldIndex].value = fv.value;
      }
    }

    // Add audit trail event
    const auditTrail = JSON.parse(doc.audit_trail || "[]");
    auditTrail.push({
      event: "document_signed",
      signer_id: signer.id,
      signer_name: signer.name,
      signer_email: signer.email,
      ip_address,
      timestamp: new Date().toISOString(),
    });

    // Check if all signers have signed
    const allSigners = await db.vaultSignSigner.findMany({
      where: { document_id: doc.id },
    });
    const allSigned = allSigners.every((s) => s.status === "signed");
    const someSigned = allSigners.some((s) => s.status === "signed");

    const recruiterName = `${doc.creator.first_name || ""} ${doc.creator.last_name || ""}`.trim() || doc.creator.email;
    const orgName = doc.organization.name;

    if (allSigned) {
      // All signers signed - document is completed
      // Generate final PDF with signatures baked in
      let finalDocumentUrl = doc.final_document_url;
      let documentHash = doc.document_hash;

      try {
        // Fetch original PDF
        let originalPdfBuffer: Buffer | null = null;
        if (doc.original_document_url) {
          try {
            const signedUrl = await getSignedUrl("vaultsign-documents", doc.original_document_url, 300);
            const pdfResponse = await fetch(signedUrl);
            if (pdfResponse.ok) {
              const arrayBuf = await pdfResponse.arrayBuffer();
              originalPdfBuffer = Buffer.from(arrayBuf);
            }
          } catch (e) {
            console.error("[VAULTSIGN_SIGN_SUBMIT] Failed to fetch original PDF:", e);
          }
        }

        if (originalPdfBuffer) {
          // Get all signers with their signature data
          const allSignersWithData = await db.vaultSignSigner.findMany({
            where: { document_id: doc.id },
          });

          // Generate the signed PDF
          const finalPdfBuffer = await generateSignedPdf(
            originalPdfBuffer,
            allSignFields,
            allSignersWithData
          );

          // Compute document hash for tamper detection
          documentHash = computeDocumentHash(finalPdfBuffer);

          // Upload final PDF
          const uploadResult = await uploadFile(
            "vaultsign-documents",
            `${doc.id}`,
            finalPdfBuffer,
            "final.pdf",
            "application/pdf"
          );
          finalDocumentUrl = uploadResult.url;
        }
      } catch (e) {
        console.error("[VAULTSIGN_SIGN_SUBMIT] Failed to generate final PDF:", e);
        // Continue without final PDF - the document is still completed
      }

      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: {
          status: "completed",
          final_document_url: finalDocumentUrl,
          document_hash: documentHash,
          sign_fields: JSON.stringify(allSignFields),
          audit_trail: JSON.stringify(auditTrail),
          updated_at: new Date(),
        },
      });

      // Send vaultsign_completed email to all signers and recruiter
      for (const s of allSigners) {
        await sendEmail({
          to: s.email,
          templateKey: "vaultsign_completed",
          variables: {
            document_name: doc.document_name,
            agency_name: orgName,
            signer_name: s.name,
          },
        });
      }

      // Send completion email to recruiter
      await sendEmail({
        to: doc.creator.email,
        templateKey: "vaultsign_completed",
        variables: {
          document_name: doc.document_name,
          agency_name: orgName,
          signer_name: recruiterName,
        },
      });

      // Check for candidate vault integration
      for (const s of allSigners) {
        const signerUser = await db.user.findFirst({
          where: { email: s.email, role: "candidate" },
        });
        if (signerUser) {
          await db.credential.create({
            data: {
              candidate_user_id: signerUser.id,
              document_name: doc.document_name,
              file_url: finalDocumentUrl || doc.original_document_url || "",
              verification_status: "verified",
              status: "active",
            },
          });

          // Create notification for the candidate
          await db.notification.create({
            data: {
              user_id: signerUser.id,
              message: `A signed copy of '${doc.document_name}' has been saved to your vault.`,
              type: "general",
            },
          });
        }
      }
    } else if (doc.signing_order === "sequential" && someSigned) {
      // Sequential signing - find next signer and send email
      const nextSigner = allSigners
        .filter((s) => s.status !== "signed" && s.status !== "declined")
        .sort((a, b) => a.signing_order_position - b.signing_order_position)[0];

      if (nextSigner) {
        await sendEmail({
          to: nextSigner.email,
          templateKey: "vaultsign_invitation",
          variables: {
            sender_name: recruiterName,
            agency_name: orgName,
            document_name: doc.document_name,
            personal_message: doc.personal_message || "",
            expiry_date: new Date(doc.expiry_date).toLocaleDateString(),
            signing_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/sign/${nextSigner.sign_token}`,
          },
        });
      }

      // Update document status to partially_signed
      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: {
          status: "partially_signed",
          sign_fields: JSON.stringify(allSignFields),
          audit_trail: JSON.stringify(auditTrail),
          updated_at: new Date(),
        },
      });
    } else {
      // Parallel signing, some signed but not all
      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: {
          status: "partially_signed",
          sign_fields: JSON.stringify(allSignFields),
          audit_trail: JSON.stringify(auditTrail),
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, allSigned });
  } catch (error) {
    console.error("[VAULTSIGN_SIGN_SUBMIT]", error);
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 }
    );
  }
}
