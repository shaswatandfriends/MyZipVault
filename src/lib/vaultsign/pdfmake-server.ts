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
 */

let _pdfmakeInstance: any = null;

/**
 * Get the pdfmake singleton with proper initialization.
 * Caches the instance for subsequent calls.
 */
export async function getPdfmakeInstance(): Promise<any> {
  if (_pdfmakeInstance) return _pdfmakeInstance;

  // Use require() for CommonJS compatibility in Next.js server environment
  const pdfmake = require('pdfmake');

  // Set fonts using the built-in Helvetica (no file system access needed)
  pdfmake.setFonts({
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  });

  // Set URL access policy to deny external resources (security best practice)
  // We don't want PDF generation to make outbound network requests
  pdfmake.setUrlAccessPolicy(() => false);

  // Set local access policy to deny local file system access (security)
  pdfmake.setLocalAccessPolicy(() => false);

  _pdfmakeInstance = pdfmake;
  return _pdfmakeInstance;
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
 * Uses pdfmake 0.3.x high-level API which:
 * - Handles virtualfs and URL resolution internally
 * - Returns a Promise<Buffer> via getBuffer()
 * - Properly manages the PDFKit document lifecycle
 *
 * @param docDefinition - pdfmake document definition object
 * @param fonts - Font definitions (unused in high-level API, kept for API compatibility)
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function generatePdfBuffer(
  docDefinition: any,
  fonts: Record<string, any> = HELVETICA_FONTS,
  timeoutMs: number = 30000
): Promise<Buffer> {
  const pdfmake = await getPdfmakeInstance();

  // Create the PDF document using the high-level API
  const pdfDoc = pdfmake.createPdf(docDefinition);

  // Generate buffer with timeout protection
  const bufferPromise = pdfDoc.getBuffer();

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
