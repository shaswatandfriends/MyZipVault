/**
 * Server-side pdfmake utility for pdfmake v0.3.x
 *
 * pdfmake 0.3.x has breaking changes from earlier versions:
 * 1. `createPdfKitDocument()` is now async (returns a Promise)
 * 2. PdfPrinter constructor requires (fontDescriptors, virtualfs, urlResolver, localAccessPolicy)
 * 3. The high-level `pdfmake` singleton handles URL resolution automatically
 * 4. `createPdf()` returns an OutputDocumentServer with `.getBuffer()` and `.getBase64()` methods
 *
 * We use the high-level API for robustness — it manages virtualfs and URLResolver internally.
 *
 * IMPORTANT: We do NOT call pdfmake.setFonts() with string names like "Helvetica" because
 * that causes pdfmake/PDFKit to look for .afm font metric files on the filesystem. In
 * deployment environments (Vercel, Docker), these files may not be available, causing crashes.
 *
 * Instead, we use PdfPrinter directly with the PDFKit built-in font descriptors,
 * which are embedded in the PDFKit binary and don't require file system access.
 */

import type { TDocumentDefinitions } from "pdfmake/interfaces";

let _pdfPrinter: any = null;

/**
 * Get the PdfPrinter instance with proper font configuration.
 * Uses PDFKit's 14 standard fonts (Helvetica, Courier, Times-Roman) which are
 * embedded in the PDFKit binary and don't need file system access.
 */
function getPdfPrinter(): any {
  if (_pdfPrinter) return _pdfPrinter;

  const PdfPrinter = require("pdfmake");

  // Define fonts using PDFKit's built-in standard font names.
  // These are the 14 standard PDF fonts that PDFKit knows about natively.
  // They don't require .afm files or any file system access.
  const fonts = {
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
    Courier: {
      normal: "Courier",
      bold: "Courier-Bold",
      italics: "Courier-Oblique",
      bolditalics: "Courier-BoldOblique",
    },
    "Times-Roman": {
      normal: "Times-Roman",
      bold: "Times-Bold",
      italics: "Times-Italic",
      bolditalics: "Times-BoldItalic",
    },
  };

  _pdfPrinter = new PdfPrinter(fonts);
  return _pdfPrinter;
}

/**
 * Standard Helvetica font configuration for pdfmake (built-in PDF fonts).
 * These don't require file system access since they're built into PDFKit.
 */
export const HELVETICA_FONTS = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

/**
 * Generate a PDF buffer from a pdfmake docDefinition.
 *
 * Uses PdfPrinter directly to avoid the pdfmake.setFonts() issue where
 * font name strings cause .afm file lookups on the filesystem.
 *
 * @param docDefinition - pdfmake document definition object
 * @param fonts - Font definitions (unused, kept for API compatibility)
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function generatePdfBuffer(
  docDefinition: TDocumentDefinitions,
  fonts: Record<string, any> = HELVETICA_FONTS,
  timeoutMs: number = 30000
): Promise<Buffer> {
  const printer = getPdfPrinter();

  // Create the PDF document using PdfPrinter
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  // Collect chunks into a buffer
  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    pdfDoc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    pdfDoc.on("error", (err: Error) => {
      reject(err);
    });
    pdfDoc.end();
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`PDF generation timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });

  const buffer = await Promise.race([bufferPromise, timeoutPromise]);

  if (!buffer || buffer.length === 0) {
    throw new Error("PDF generation produced an empty buffer");
  }

  return buffer;
}

/**
 * @deprecated Use generatePdfBuffer instead. This function is kept for backward compatibility
 * but the pdfmake singleton approach with setFonts() causes deployment crashes.
 */
export async function getPdfmakeInstance(): Promise<any> {
  console.warn("[VAULTSIGN] getPdfmakeInstance() is deprecated. Use generatePdfBuffer() directly.");
  const pdfmake = require("pdfmake");
  return pdfmake;
}
