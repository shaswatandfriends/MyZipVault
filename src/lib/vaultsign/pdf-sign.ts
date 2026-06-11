import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import SHA256 from "crypto-js/sha256";

interface SignField {
  id: string;
  type: string; // signature, date, full_name, initials, email, text, checkbox
  page: number; // 1-based
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  assigned_to_signer_index: number;
  label: string;
  required: boolean;
  value: string | null;
}

interface SignatureData {
  type: string; // drawn, typed, uploaded
  font?: string;
  text?: string;
  image_base64?: string;
}

interface SignerRecord {
  id: number;
  signer_index: number;
  name: string;
  email: string;
  status: string;
  signature_data: string | null;
}

/**
 * Generate the final signed PDF by baking all signatures and field values into the original PDF.
 * Uses pdf-lib to embed signatures at the correct positions.
 */
export async function generateSignedPdf(
  originalPdfBuffer: Buffer,
  signFields: SignField[],
  signers: SignerRecord[]
): Promise<{ pdfBuffer: Buffer; hash: string }> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  for (const field of signFields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert percentage positions to absolute coordinates
    const x = (field.x_percent / 100) * pageWidth;
    const y = pageHeight - ((field.y_percent / 100) * pageHeight); // PDF y-axis is bottom-up
    const fieldWidth = (field.width_percent / 100) * pageWidth;
    const fieldHeight = (field.height_percent / 100) * pageHeight;

    if (field.type === "signature" && field.value === "signed") {
      // Find the signer who signed this field
      const signer = signers.find(
        (s) => s.signer_index === field.assigned_to_signer_index
      );

      if (signer?.signature_data) {
        try {
          let parsedSigData: any;
          try {
            parsedSigData = JSON.parse(signer.signature_data);
          } catch {
            continue;
          }

          // Support per-field signatures (new format) or single signature (legacy)
          let sigData: SignatureData;
          if (parsedSigData.per_field && parsedSigData.per_field[field.id]) {
            sigData = parsedSigData.per_field[field.id];
          } else if (parsedSigData.primary) {
            sigData = parsedSigData.primary;
          } else if (parsedSigData.image_base64 || parsedSigData.text) {
            sigData = parsedSigData;
          } else {
            continue;
          }

          if (sigData.image_base64) {
            let base64Data = sigData.image_base64;
            if (base64Data.includes(",")) {
              base64Data = base64Data.split(",")[1];
            }

            const imageBytes = Buffer.from(base64Data, "base64");

            try {
              // Try PNG first
              const pngImage = await pdfDoc.embedPng(imageBytes);
              const imgDims = pngImage.scale(1);
              const scale = Math.min(
                fieldWidth / imgDims.width,
                fieldHeight / imgDims.height
              ) * 0.85;

              page.drawImage(pngImage, {
                x: x + (fieldWidth - imgDims.width * scale) / 2,
                y: y - fieldHeight + (fieldHeight - imgDims.height * scale) / 2,
                width: imgDims.width * scale,
                height: imgDims.height * scale,
              });
            } catch {
              try {
                const jpgImage = await pdfDoc.embedJpg(imageBytes);
                const imgDims = jpgImage.scale(1);
                const scale = Math.min(
                  fieldWidth / imgDims.width,
                  fieldHeight / imgDims.height
                ) * 0.85;

                page.drawImage(jpgImage, {
                  x: x + (fieldWidth - imgDims.width * scale) / 2,
                  y: y - fieldHeight + (fieldHeight - imgDims.height * scale) / 2,
                  width: imgDims.width * scale,
                  height: imgDims.height * scale,
                });
              } catch {
                // If image embedding fails, draw text instead
                page.drawText(sigData.text || signer.name, {
                  x: x + 4,
                  y: y - fieldHeight / 2 - 4,
                  size: Math.min(fieldHeight * 0.5, 14),
                  font: helveticaOblique,
                  color: rgb(0, 0, 0),
                });
              }
            }
          } else if (sigData.text) {
            // Typed signature — render in italic style
            const fontSize = Math.min(fieldHeight * 0.55, 18);
            page.drawText(sigData.text, {
              x: x + 4,
              y: y - fieldHeight / 2 - fontSize / 3,
              size: fontSize,
              font: helveticaOblique,
              color: rgb(0, 0, 0),
            });
          }
        } catch (err) {
          console.error("[VAULTSIGN] Error embedding signature:", err);
        }
      }

      // Draw subtle field border for signature fields
      page.drawRectangle({
        x,
        y: y - fieldHeight,
        width: fieldWidth,
        height: fieldHeight,
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 0.5,
        opacity: 0,
      });

    } else if (field.type === "date" && field.value) {
      const fontSize = Math.min(fieldHeight * 0.5, 11);
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - fontSize / 3,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });

    } else if (field.type === "full_name" && field.value) {
      const fontSize = Math.min(fieldHeight * 0.5, 12);
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - fontSize / 3,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });

    } else if (field.type === "initials" && field.value) {
      const fontSize = Math.min(fieldHeight * 0.55, 13);
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - fontSize / 3,
        size: fontSize,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });

    } else if (field.type === "email" && field.value) {
      const fontSize = Math.min(fieldHeight * 0.45, 10);
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - fontSize / 3,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });

    } else if (field.type === "text" && field.value) {
      const fontSize = Math.min(fieldHeight * 0.5, 11);
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - fontSize / 3,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });

    } else if (field.type === "checkbox" && field.value === "checked") {
      // Draw a checkmark using lines
      const checkSize = Math.min(fieldWidth, fieldHeight) * 0.6;
      const checkX = x + (fieldWidth - checkSize) / 2;
      const checkY = y - fieldHeight + (fieldHeight - checkSize) / 2;
      page.drawLine({
        start: { x: checkX, y: checkY + checkSize * 0.3 },
        end: { x: checkX + checkSize * 0.35, y: checkY },
        thickness: 1.5,
        color: rgb(0.09, 0.58, 0.2),
      });
      page.drawLine({
        start: { x: checkX + checkSize * 0.35, y: checkY },
        end: { x: checkX + checkSize, y: checkY + checkSize * 0.7 },
        thickness: 1.5,
        color: rgb(0.09, 0.58, 0.2),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const hash = computeDocumentHash(pdfBuffer);

  return { pdfBuffer, hash };
}

/**
 * Compute SHA-256 hash of a PDF buffer for tamper detection.
 */
export function computeDocumentHash(pdfBuffer: Buffer): string {
  const hash = SHA256(pdfBuffer.toString("base64"));
  return hash.toString();
}

/**
 * Add header and footer overlay to all pages of a PDF.
 * Used for uploaded PDFs that need company branding.
 */
export async function addHeaderFooterToPdf(
  pdfBuffer: Buffer,
  options: {
    companyName?: string;
    companyLogoUrl?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
    documentTitle?: string;
    showHeaderFooter?: boolean;
  }
): Promise<Buffer> {
  if (options.showHeaderFooter === false) return pdfBuffer;

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Try to embed company logo if URL provided
  let logoImage: any = null;
  let logoDims = { width: 0, height: 0 };
  if (options.companyLogoUrl) {
    try {
      let logoBytes: Buffer;
      if (options.companyLogoUrl.startsWith('data:')) {
        const base64 = options.companyLogoUrl.split(',')[1];
        logoBytes = Buffer.from(base64, 'base64');
      } else {
        const resp = await fetch(options.companyLogoUrl, { signal: AbortSignal.timeout(5000) });
        logoBytes = Buffer.from(await resp.arrayBuffer());
      }
      try {
        logoImage = await pdfDoc.embedPng(logoBytes);
        logoDims = logoImage.scale(1);
      } catch {
        try {
          logoImage = await pdfDoc.embedJpg(logoBytes);
          logoDims = logoImage.scale(1);
        } catch {
          logoImage = null;
        }
      }
    } catch {
      logoImage = null;
    }
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // ─── HEADER ───
    const headerY = height - 30;
    let headerCurrentX = 30;

    // Draw a subtle separator line under header
    page.drawLine({
      start: { x: 30, y: headerY - 10 },
      end: { x: width - 30, y: headerY - 10 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Company logo
    if (logoImage) {
      const logoHeight = 22;
      const logoScale = logoHeight / logoDims.height;
      const logoWidth = logoDims.width * logoScale;
      page.drawImage(logoImage, {
        x: headerCurrentX,
        y: headerY - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
      headerCurrentX += logoWidth + 8;
    }

    // Company name (bold)
    if (options.companyName) {
      page.drawText(options.companyName, {
        x: headerCurrentX,
        y: headerY - 10,
        size: 11,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    // Phone + Email (right of logo, below company name)
    if (options.companyPhone || options.companyEmail) {
      const contactText = [options.companyPhone, options.companyEmail].filter(Boolean).join(' | ');
      page.drawText(contactText, {
        x: headerCurrentX,
        y: headerY - 22,
        size: 7.5,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Address (below contact)
    if (options.companyAddress) {
      const addressText = options.companyAddress.length > 80
        ? options.companyAddress.substring(0, 80) + '...'
        : options.companyAddress;
      page.drawText(addressText, {
        x: headerCurrentX,
        y: headerY - 32,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Document title (right-aligned)
    if (options.documentTitle) {
      const titleWidth = helveticaBold.widthOfTextAtSize(options.documentTitle, 10);
      page.drawText(options.documentTitle, {
        x: width - 30 - titleWidth,
        y: headerY - 10,
        size: 10,
        font: helveticaBold,
        color: rgb(0.09, 0.4, 0.2),
      });
    }

    // ─── FOOTER ───
    const footerY = 28;

    // Separator line above footer
    page.drawLine({
      start: { x: 30, y: footerY + 12 },
      end: { x: width - 30, y: footerY + 12 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });

    // "All rights reserved" + "legally binding" — center
    const rightsText = `All rights reserved © ${options.companyName || 'MyZipVault'}. This document is legally binding.`;
    const rightsWidth = helveticaOblique.widthOfTextAtSize(rightsText, 7);
    page.drawText(rightsText, {
      x: (width - rightsWidth) / 2,
      y: footerY + 2,
      size: 7,
      font: helveticaOblique,
      color: rgb(0.55, 0.55, 0.55),
    });

    // "Powered by VaultSign" — center, smaller
    const poweredText = 'Powered by VaultSign';
    const poweredWidth = helvetica.widthOfTextAtSize(poweredText, 6);
    page.drawText(poweredText, {
      x: (width - poweredWidth) / 2,
      y: footerY - 8,
      size: 6,
      font: helvetica,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Page X of Y — right-aligned
    const pageText = `Page ${i + 1} of ${totalPages}`;
    const pageTextWidth = helvetica.widthOfTextAtSize(pageText, 7.5);
    page.drawText(pageText, {
      x: width - 30 - pageTextWidth,
      y: footerY - 8,
      size: 7.5,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Add an audit trail page to the PDF.
 */
export async function addAuditTrailPage(
  pdfBuffer: Buffer,
  auditEntries: Array<{
    event: string;
    user_name: string;
    ip_address?: string;
    device_info?: string;
    timestamp: string;
  }>,
  documentName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Title
  page.drawText("Audit Trail — VaultSign", {
    x: 40,
    y: height - 50,
    size: 18,
    font: fontBold,
    color: rgb(0.09, 0.4, 0.2),
  });

  page.drawText(`Document: ${documentName}`, {
    x: 40,
    y: height - 75,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`Generated: ${new Date().toISOString()}`, {
    x: 40,
    y: height - 92,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Divider
  page.drawLine({
    start: { x: 40, y: height - 105 },
    end: { x: width - 40, y: height - 105 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  let y = height - 130;
  for (const entry of auditEntries) {
    if (y < 60) break;

    const dateStr = new Date(entry.timestamp).toLocaleString();
    page.drawText(`${entry.event}`, {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;
    page.drawText(`By: ${entry.user_name}  |  IP: ${entry.ip_address || "N/A"}  |  ${dateStr}`, {
      x: 40,
      y,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    if (entry.device_info) {
      y -= 14;
      page.drawText(`Device: ${entry.device_info.substring(0, 80)}`, {
        x: 40,
        y,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
    y -= 24;
  }

  // Footer
  page.drawText("This document was signed using VaultSign by MyZipVault. Electronic signatures are legally binding.", {
    x: 40,
    y: 30,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
