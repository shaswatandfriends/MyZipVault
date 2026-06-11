/**
 * Server-side pdfmake utility with ESM/CJS interop handling.
 *
 * The "S.default is not a constructor" error occurs because pdfmake's CJS
 * `module.exports = PdfPrinter` gets wrapped by webpack/Next.js as
 * `{ default: PdfPrinter }`, but the `import X from "pdfmake"` sometimes
 * doesn't unwrap correctly.
 *
 * This module uses dynamic import with fallback chain to reliably get the
 * PdfPrinter class regardless of the bundler's interop behavior.
 */

let _cachedPrinter: any = null;

/**
 * Get the PdfPrinter constructor with proper ESM/CJS interop handling.
 * Caches the result for subsequent calls.
 */
export async function getPdfPrinter(): Promise<any> {
  if (_cachedPrinter) return _cachedPrinter;

  const pdfmakeModule = await import("pdfmake");
  const mod: any = pdfmakeModule;

  // Strategy 1: mod.default is a function with createPdfKitDocument on prototype
  if (mod.default && typeof mod.default === "function") {
    if (mod.default.prototype?.createPdfKitDocument) {
      _cachedPrinter = mod.default;
      return _cachedPrinter;
    }
    // Strategy 2: double-wrapped default (webpack sometimes does this)
    if (mod.default.default && typeof mod.default.default === "function") {
      _cachedPrinter = mod.default.default;
      return _cachedPrinter;
    }
  }

  // Strategy 3: the module itself is the class
  if (typeof mod === "function") {
    _cachedPrinter = mod;
    return _cachedPrinter;
  }

  // Strategy 4: try to import the Printer sub-path directly
  try {
    const printerModule = await import("pdfmake/js/Printer");
    _cachedPrinter = printerModule.default || printerModule;
    return _cachedPrinter;
  } catch {
    // Fall through
  }

  // Strategy 5: last resort — return whatever we got
  _cachedPrinter = mod;
  return _cachedPrinter;
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
 * Handles all the boilerplate of creating the printer, generating the PDF,
 * and collecting it into a buffer with timeout protection.
 */
export async function generatePdfBuffer(
  docDefinition: any,
  fonts: Record<string, any> = HELVETICA_FONTS,
  timeoutMs: number = 30000
): Promise<Buffer> {
  const PdfPrinterClass = await getPdfPrinter();
  const printer = new PdfPrinterClass(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`PDF generation timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);

    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks));
    });
    pdfDoc.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
    pdfDoc.end();
  });
}
