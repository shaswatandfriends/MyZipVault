import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createHash } from "crypto";

interface SignField {
  id: string;
  type: string;
  page: number;
  x: number; // percentage of page width
  y: number; // percentage of page height
  width: number; // percentage
  height: number; // percentage
  assigned_to_signer_id: string;
  label: string;
  required: boolean;
  value: string | null;
}

interface SignatureData {
  type: string;
  font: string;
  text: string;
  image_base64: string;
}

interface SignerRecord {
  id: number;
  party_number: number;
  name: string;
  email: string;
  status: string;
  signature_data: string | null;
}

/**
 * Generate the final signed PDF by baking all signatures and field values into the original PDF.
 */
export async function generateSignedPdf(
  originalPdfBuffer: Buffer,
  signFields: SignField[],
  signers: SignerRecord[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const field of signFields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Convert percentage positions to absolute coordinates
    const x = (field.x / 100) * pageWidth;
    const y = pageHeight - ((field.y / 100) * pageHeight); // PDF y-axis is bottom-up
    const fieldWidth = (field.width / 100) * pageWidth;
    const fieldHeight = (field.height / 100) * pageHeight;

    if (field.type === "signature" && field.value === "signed") {
      // Find the signer who signed this field
      const signer = signers.find(
        (s) =>
          `party_${s.party_number}` === field.assigned_to_signer_id ||
          String(s.id) === field.assigned_to_signer_id
      );

      if (signer?.signature_data) {
        try {
          let sigData: SignatureData;
          try {
            sigData = JSON.parse(signer.signature_data);
          } catch {
            continue;
          }

          if (sigData.image_base64) {
            // Extract base64 data
            let base64Data = sigData.image_base64;
            if (base64Data.includes(",")) {
              base64Data = base64Data.split(",")[1];
            }

            const imageBytes = Buffer.from(base64Data, "base64");

            try {
              // Try PNG first
              const pngImage = await pdfDoc.embedPng(imageBytes);
              const imgDims = pngImage.scale(1);
              // Scale to fit within the field box
              const scale = Math.min(
                fieldWidth / imgDims.width,
                fieldHeight / imgDims.height
              ) * 0.9;

              page.drawImage(pngImage, {
                x: x + 2,
                y: y - fieldHeight + 2,
                width: imgDims.width * scale,
                height: imgDims.height * scale,
              });
            } catch {
              // Try JPEG
              try {
                const jpgImage = await pdfDoc.embedJpg(imageBytes);
                const imgDims = jpgImage.scale(1);
                const scale = Math.min(
                  fieldWidth / imgDims.width,
                  fieldHeight / imgDims.height
                ) * 0.9;

                page.drawImage(jpgImage, {
                  x: x + 2,
                  y: y - fieldHeight + 2,
                  width: imgDims.width * scale,
                  height: imgDims.height * scale,
                });
              } catch {
                // If image embedding fails, draw text instead
                page.drawText(sigData.text || signer.name, {
                  x: x + 4,
                  y: y - fieldHeight / 2 - 4,
                  size: Math.min(fieldHeight * 0.5, 14),
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
                });
              }
            }
          } else if (sigData.text) {
            // Typed signature - render as italic text
            page.drawText(sigData.text, {
              x: x + 4,
              y: y - fieldHeight / 2 - 4,
              size: Math.min(fieldHeight * 0.6, 16),
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
          }
        } catch (err) {
          console.error("[PDF_GEN] Error embedding signature:", err);
        }
      }

      // Draw field border
      page.drawRectangle({
        x,
        y: y - fieldHeight,
        width: fieldWidth,
        height: fieldHeight,
        borderColor: rgb(0.09, 0.09, 0.09),
        borderWidth: 0.5,
        opacity: 0,
      });

    } else if (field.type === "date" && field.value) {
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - 3,
        size: Math.min(fieldHeight * 0.5, 10),
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

    } else if (field.type === "full_name" && field.value) {
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - 3,
        size: Math.min(fieldHeight * 0.5, 10),
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

    } else if (field.type === "initials" && field.value) {
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - 3,
        size: Math.min(fieldHeight * 0.5, 10),
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

    } else if (field.type === "email" && field.value) {
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - 3,
        size: Math.min(fieldHeight * 0.45, 9),
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

    } else if (field.type === "text" && field.value) {
      page.drawText(field.value, {
        x: x + 4,
        y: y - fieldHeight / 2 - 3,
        size: Math.min(fieldHeight * 0.5, 10),
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

    } else if (field.type === "checkbox" && field.value === "checked") {
      // Draw a checkmark
      const checkSize = Math.min(fieldWidth, fieldHeight) * 0.6;
      const checkX = x + (fieldWidth - checkSize) / 2;
      const checkY = y - fieldHeight + (fieldHeight - checkSize) / 2;
      page.drawText("✓", {
        x: checkX,
        y: checkY,
        size: checkSize,
        font: helveticaBold,
        color: rgb(0.09, 0.4, 0.2),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Compute SHA-256 hash of a PDF buffer for tamper detection.
 */
export function computeDocumentHash(pdfBuffer: Buffer): string {
  return createHash("sha256").update(pdfBuffer).digest("hex");
}
