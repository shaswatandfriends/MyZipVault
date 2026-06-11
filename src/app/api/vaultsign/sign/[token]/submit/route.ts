import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSignedPdf, addAuditTrailPage, computeDocumentHash } from "@/lib/vaultsign/pdf-sign";
import { uploadGeneratedPdf, getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";
import { sendDocumentCompletedEmail, generateSigningLink, sendDocumentSentEmail } from "@/lib/vaultsign/email";
import type { SignField, AuditTrailEntry, SignerSignatureStore } from "@/lib/vaultsign/types";

// POST: Accept signature data, field values, IP address, device info
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const signer = await db.vaultSignSigner.findUnique({
      where: { sign_token: token },
      include: {
        document: {
          include: {
            signers: { orderBy: { signing_order_position: "asc" } },
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!signer) {
      return NextResponse.json({ error: "Invalid signing link" }, { status: 404 });
    }

    if (signer.status === "signed") {
      return NextResponse.json({ error: "You have already signed this document" }, { status: 400 });
    }

    if (signer.document.status === "voided" || signer.document.status === "expired") {
      return NextResponse.json({ error: "Document is no longer actionable" }, { status: 410 });
    }

    const body = await request.json();
    const { field_values, signature_data, agree_to_electronic } = body;

    if (!agree_to_electronic) {
      return NextResponse.json({ error: "You must agree to use electronic records and signatures" }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Update sign field values
    const currentFields: SignField[] = JSON.parse(signer.document.sign_fields || "[]");
    const updatedFields = currentFields.map((field) => {
      if (field.assigned_to_signer_index === signer.signer_index && field_values) {
        const fieldValue = field_values[field.id];
        if (fieldValue !== undefined) {
          return { ...field, value: fieldValue };
        }
      }
      return field;
    });

    // Update signer data
    // Frontend sends: { fieldId1: { type, image_base64/text }, fieldId2: { ... } }
    // We need to store as: { per_field: { fieldId1: { ... }, fieldId2: { ... } } }
    // so pdf-sign.ts can look up each field's signature by ID.
    const signerSignatureStore: SignerSignatureStore = {};
    if (signature_data) {
      if (signature_data.per_field) {
        // Already in per_field format
        signerSignatureStore.per_field = signature_data.per_field;
      } else if (signature_data.type || signature_data.image_base64 || signature_data.text) {
        // Single signature object (legacy) — store as primary
        signerSignatureStore.primary = signature_data;
      } else {
        // Frontend sends { fieldId: signatureData } map — treat as per_field
        signerSignatureStore.per_field = signature_data;
      }
    }

    await db.vaultSignSigner.update({
      where: { id: signer.id },
      data: {
        status: "signed",
        signed_at: new Date(),
        ip_address: ipAddress,
        device_info: userAgent.substring(0, 500),
        signature_data: JSON.stringify(signerSignatureStore),
      },
    });

    // Update document fields
    await db.vaultSignDocument.update({
      where: { id: signer.document.id },
      data: {
        sign_fields: JSON.stringify(updatedFields),
        updated_at: new Date(),
      },
    });

    // Add audit trail entry
    const auditTrail: AuditTrailEntry[] = JSON.parse(signer.document.audit_trail || "[]");
    auditTrail.push({
      event: "document_signed",
      user_name: signer.name,
      ip_address: ipAddress,
      device_info: userAgent.substring(0, 200),
      timestamp: new Date().toISOString(),
    });

    // Check if all signers have signed
    const refreshedDocument = await db.vaultSignDocument.findUnique({
      where: { id: signer.document.id },
      include: { signers: true },
    });

    if (!refreshedDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const allSigned = refreshedDocument.signers.every((s) => s.status === "signed");
    const anyDeclined = refreshedDocument.signers.some((s) => s.status === "declined");

    if (allSigned) {
      // Generate final PDF with all signatures baked in
      try {
        // Fetch the source PDF
        let pdfSourceUrl = "";
        if (refreshedDocument.source_type === "pdf" && refreshedDocument.original_file_url) {
          pdfSourceUrl = refreshedDocument.original_file_url;
        } else if (refreshedDocument.edited_pdf_url) {
          pdfSourceUrl = refreshedDocument.edited_pdf_url;
        } else if (refreshedDocument.original_file_url) {
          pdfSourceUrl = refreshedDocument.original_file_url;
        }

        if (pdfSourceUrl) {
          // Handle data: URLs (base64 encoded PDFs)
          let pdfBufferFromSource: Buffer;
          if (pdfSourceUrl.startsWith("data:")) {
            const base64 = pdfSourceUrl.split(",")[1];
            if (!base64) throw new Error("Invalid data URL for PDF source");
            pdfBufferFromSource = Buffer.from(base64, "base64");
          } else {
            // Download the PDF from URL
            // Try to get a signed URL first for Supabase storage URLs
            let fetchUrl = pdfSourceUrl;
            try {
              const { getDocumentSignedUrl: getSignedUrl } = await import("@/lib/vaultsign/supabase-storage");
              fetchUrl = await getSignedUrl(pdfSourceUrl, 5);
            } catch {
              // Use original URL as-is
            }
            const pdfResponse = await fetch(fetchUrl);
            const pdfArrayBuffer = await pdfResponse.arrayBuffer();
            pdfBufferFromSource = Buffer.from(pdfArrayBuffer);
          }

          // Generate signed PDF
          const signFields: SignField[] = JSON.parse(refreshedDocument.sign_fields || "[]");
          const signerRecords = refreshedDocument.signers.map((s) => ({
            id: s.id,
            signer_index: s.signer_index,
            name: s.name,
            email: s.email,
            status: s.status,
            signature_data: s.signature_data,
          }));

          const { pdfBuffer: signedPdfBuffer, hash } = await generateSignedPdf(pdfBufferFromSource, signFields, signerRecords);

          // Add audit trail page
          const finalPdf = await addAuditTrailPage(signedPdfBuffer, auditTrail, refreshedDocument.document_name);

          // Upload final PDF
          const uploadResult = await uploadGeneratedPdf(
            finalPdf,
            `org-${refreshedDocument.organization_id}/doc-${refreshedDocument.id}`,
            `final-${Date.now()}.pdf`
          );

          // Update document with final URL and hash
          auditTrail.push({
            event: "document_completed",
            user_name: "System",
            timestamp: new Date().toISOString(),
          });

          await db.vaultSignDocument.update({
            where: { id: refreshedDocument.id },
            data: {
              status: "completed",
              final_document_url: uploadResult.url,
              document_hash: hash,
              audit_trail: JSON.stringify(auditTrail),
              updated_at: new Date(),
            },
          });

          // Send completion emails to all signers
          for (const s of refreshedDocument.signers) {
            await sendDocumentCompletedEmail({
              recipientEmail: s.email,
              recipientName: s.name,
              documentName: refreshedDocument.document_name,
              organizationName: refreshedDocument.organization?.name || "MyZipVault",
            });
          }
        } else {
          // No PDF source URL — try to generate from TipTap content for Word docs
          if (refreshedDocument.source_type === "word" && refreshedDocument.tiptap_content) {
            try {
              const { tiptapToPdfmake, htmlToPdfmake } = await import("@/lib/vaultsign/tiptap-to-pdfmake");
              const { generatePdfBuffer, HELVETICA_FONTS } = await import("@/lib/vaultsign/pdfmake-server");

              const placeholderValues = JSON.parse(refreshedDocument.placeholder_values || "{}");
              const pdfOptions = {
                headerConfig: (() => { try { return JSON.parse((refreshedDocument as any).header_config || "{}"); } catch { return {}; } })(),
                footerConfig: (() => { try { return JSON.parse((refreshedDocument as any).footer_config || "{}"); } catch { return {}; } })(),
                organization: refreshedDocument.organization ? {
                  name: refreshedDocument.organization.name || undefined,
                  logo_url: (refreshedDocument.organization as any).company_logo_url || undefined,
                  address: (refreshedDocument.organization as any).company_address || undefined,
                  phone: (refreshedDocument.organization as any).company_phone || undefined,
                  email: (refreshedDocument.organization as any).company_email || undefined,
                } : undefined,
                documentTitle: refreshedDocument.document_name,
                placeholderValues,
              };

              let docDefinition;
              const rawContent = refreshedDocument.tiptap_content;
              try {
                const parsed = JSON.parse(rawContent);
                if (parsed.type === "doc" && parsed.content) {
                  docDefinition = tiptapToPdfmake(rawContent, pdfOptions);
                } else {
                  docDefinition = htmlToPdfmake(rawContent, pdfOptions);
                }
              } catch {
                docDefinition = htmlToPdfmake(rawContent, pdfOptions);
              }

              if (docDefinition && docDefinition.content && docDefinition.content.length > 0) {
                const generatedBuffer = await generatePdfBuffer(docDefinition, HELVETICA_FONTS, 30000);

                // Bake signatures into the generated PDF
                const signFieldsList: SignField[] = JSON.parse(refreshedDocument.sign_fields || "[]");
                const signerRecords = refreshedDocument.signers.map((s) => ({
                  id: s.id,
                  signer_index: s.signer_index,
                  name: s.name,
                  email: s.email,
                  status: s.status,
                  signature_data: s.signature_data,
                }));

                let finalBuffer: Buffer;
                try {
                  const { pdfBuffer: signedPdfBuffer, hash } = await generateSignedPdf(generatedBuffer, signFieldsList, signerRecords);
                  // Add audit trail page
                  finalBuffer = await addAuditTrailPage(signedPdfBuffer, auditTrail, refreshedDocument.document_name);
                } catch (sigErr) {
                  console.error("[VAULTSIGN] Error baking signatures into TipTap-generated PDF:", sigErr);
                  // Fall back to unsigned PDF + audit trail
                  finalBuffer = await addAuditTrailPage(generatedBuffer, auditTrail, refreshedDocument.document_name);
                }

                const uploadResult = await uploadGeneratedPdf(
                  finalBuffer,
                  `org-${refreshedDocument.organization_id}/doc-${refreshedDocument.id}`,
                  `final-${Date.now()}.pdf`
                );

                auditTrail.push({
                  event: "document_completed",
                  user_name: "System",
                  timestamp: new Date().toISOString(),
                });

                await db.vaultSignDocument.update({
                  where: { id: refreshedDocument.id },
                  data: {
                    status: "completed",
                    final_document_url: uploadResult.url,
                    audit_trail: JSON.stringify(auditTrail),
                    updated_at: new Date(),
                  },
                });

                // Send completion emails
                for (const s of refreshedDocument.signers) {
                  await sendDocumentCompletedEmail({
                    recipientEmail: s.email,
                    recipientName: s.name,
                    documentName: refreshedDocument.document_name,
                    organizationName: refreshedDocument.organization?.name || "MyZipVault",
                  });
                }
              } else {
                throw new Error("No printable content");
              }
            } catch (genErr) {
              console.error("[VAULTSIGN] On-the-fly PDF generation for completed doc failed:", genErr);
              // Just mark as completed without final_document_url
              await db.vaultSignDocument.update({
                where: { id: refreshedDocument.id },
                data: {
                  status: "completed",
                  audit_trail: JSON.stringify(auditTrail),
                  updated_at: new Date(),
                },
              });
            }
          } else {
            // No PDF to bake signatures into — just mark as completed
            await db.vaultSignDocument.update({
              where: { id: refreshedDocument.id },
              data: {
                status: "completed",
                audit_trail: JSON.stringify(auditTrail),
                updated_at: new Date(),
              },
            });
          }
        }
      } catch (err) {
        console.error("[VAULTSIGN] Final PDF generation error:", err);
        // Still mark as completed even if PDF generation fails
        await db.vaultSignDocument.update({
          where: { id: refreshedDocument.id },
          data: {
            status: "completed",
            audit_trail: JSON.stringify(auditTrail),
            updated_at: new Date(),
          },
        });
      }
    } else if (refreshedDocument.signing_order === "sequential") {
      // Sequential signing — notify the next signer
      const nextSigner = refreshedDocument.signers
        .filter((s) => s.status === "pending" || s.status === "sent")
        .sort((a, b) => (a.signing_order_position || 1) - (b.signing_order_position || 1))[0];

      if (nextSigner) {
        await db.vaultSignDocument.update({
          where: { id: refreshedDocument.id },
          data: {
            status: "partially_signed",
            audit_trail: JSON.stringify(auditTrail),
            updated_at: new Date(),
          },
        });

        // Update next signer status
        await db.vaultSignSigner.update({
          where: { id: nextSigner.id },
          data: { status: "sent" },
        });

        // Send email to next signer
        const senderName = signer.name;
        const orgName = refreshedDocument.organization?.name || "MyZipVault";
        await sendDocumentSentEmail({
          signerName: nextSigner.name,
          signerEmail: nextSigner.email,
          documentName: refreshedDocument.document_name,
          senderName,
          organizationName: orgName,
          signingLink: generateSigningLink(nextSigner.sign_token),
          personal_message: refreshedDocument.personal_message || undefined,
          expiryDate: refreshedDocument.expiry_date.toISOString().split("T")[0],
        });
      }
    } else {
      // Parallel signing — just update status
      await db.vaultSignDocument.update({
        where: { id: refreshedDocument.id },
        data: {
          status: "partially_signed",
          audit_trail: JSON.stringify(auditTrail),
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Signature submitted successfully",
      status: allSigned ? "completed" : "partially_signed",
    });
  } catch (error) {
    console.error("[VAULTSIGN] Submit signature error:", error);
    return NextResponse.json({ error: "Failed to submit signature" }, { status: 500 });
  }
}
