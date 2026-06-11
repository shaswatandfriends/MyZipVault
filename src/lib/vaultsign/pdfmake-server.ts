/**
 * Server-side pdfmake utility for pdfmake v0.3.x
 *
 * pdfmake 0.3.x uses:
 * - PdfPrinter class (from pdfmake/js/Printer.js) for server-side PDF generation
 * - Requires virtualfs for font file access
 * - Requires URLResolver for URL-based resources
 * - createPdfKitDocument() is async (returns a Promise)
 *
 * Font handling:
 * We register Liberation Sans TTF fonts in virtualfs and reference them by path.
 * This avoids the .afm file lookup issue that crashes on Vercel/Docker deployments
 * when using standard font names like "Helvetica" directly.
 *
 * Liberation Sans is metrically identical to Helvetica (same character widths),
 * so documents designed for Helvetica will look identical.
 */

import type { TDocumentDefinitions } from "pdfmake/interfaces";
import fs from "fs";
import path from "path";

// Lazy-loaded pdfmake modules
let _printer: any = null;
let _vfs: any = null;
let _fontsRegistered = false;

// Font paths in virtualfs
const FONT_VFS_PREFIX = "/fonts/liberation";

/**
 * Get the pdfmake virtualfs singleton.
 */
function getVirtualfs(): any {
  if (_vfs) return _vfs;
  const pdfmake = require("pdfmake");
  _vfs = pdfmake.virtualfs;
  return _vfs;
}

/**
 * Register Liberation Sans fonts in virtualfs.
 * These are metrically identical to Helvetica.
 */
function registerFonts(): void {
  if (_fontsRegistered) return;

  const vfs = getVirtualfs();

  const fontFiles: Record<string, string> = {
    "LiberationSans-Regular.ttf": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "LiberationSans-Bold.ttf": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "LiberationSans-Italic.ttf": "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
    "LiberationSans-BoldItalic.ttf": "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
  };

  for (const [name, fsPath] of Object.entries(fontFiles)) {
    try {
      if (fs.existsSync(fsPath)) {
        const data = fs.readFileSync(fsPath);
        vfs.writeFileSync(`${FONT_VFS_PREFIX}/${name}`, data);
      }
    } catch (err) {
      console.error(`[VAULTSIGN] Failed to register font ${name}:`, err);
    }
  }

  _fontsRegistered = true;
}

/**
 * Get the PdfPrinter instance with proper font configuration.
 * Uses Liberation Sans fonts registered in virtualfs.
 */
function getPdfPrinter(): any {
  if (_printer) return _printer;

  registerFonts();

  const PdfPrinter = require("pdfmake/js/Printer.js").default;
  const URLResolver = require("pdfmake/js/URLResolver.js").default;
  const vfs = getVirtualfs();

  // Define fonts using virtualfs paths
  const fonts = {
    Helvetica: {
      normal: `${FONT_VFS_PREFIX}/LiberationSans-Regular.ttf`,
      bold: `${FONT_VFS_PREFIX}/LiberationSans-Bold.ttf`,
      italics: `${FONT_VFS_PREFIX}/LiberationSans-Italic.ttf`,
      bolditalics: `${FONT_VFS_PREFIX}/LiberationSans-BoldItalic.ttf`,
    },
    Courier: {
      normal: `${FONT_VFS_PREFIX}/LiberationSans-Regular.ttf`,
      bold: `${FONT_VFS_PREFIX}/LiberationSans-Bold.ttf`,
      italics: `${FONT_VFS_PREFIX}/LiberationSans-Italic.ttf`,
      bolditalics: `${FONT_VFS_PREFIX}/LiberationSans-BoldItalic.ttf`,
    },
  };

  const urlResolver = new URLResolver(vfs, () => true);
  _printer = new PdfPrinter(fonts, vfs, urlResolver, () => true);
  return _printer;
}

/**
 * Standard Helvetica font configuration (kept for API compatibility).
 * Actual font resolution happens inside PdfPrinter via virtualfs paths.
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
 * Uses PdfPrinter with Liberation Sans fonts registered in virtualfs.
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

  // Ensure default font is set
  if (!docDefinition.defaultStyle) {
    (docDefinition as any).defaultStyle = { font: "Helvetica" };
  } else if (!(docDefinition.defaultStyle as any).font) {
    (docDefinition.defaultStyle as any).font = "Helvetica";
  }

  // Create the PDF document (async in pdfmake 0.3.x)
  const pdfDoc = await printer.createPdfKitDocument(docDefinition);

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
 * @deprecated Use generatePdfBuffer instead.
 */
export async function getPdfmakeInstance(): Promise<any> {
  console.warn("[VAULTSIGN] getPdfmakeInstance() is deprecated. Use generatePdfBuffer() directly.");
  return getPdfPrinter();
}
