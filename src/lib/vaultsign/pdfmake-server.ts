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
 *
 * Fonts are bundled in the project at src/lib/vaultsign/fonts/ to ensure
 * they're available on Vercel's serverless environment (which doesn't have
 * system fonts installed). Falls back to system path if bundled fonts
 * aren't found (local dev).
 */
function registerFonts(): void {
  if (_fontsRegistered) return;

  const vfs = getVirtualfs();

  // Try multiple paths to find the fonts:
  // 1. __dirname/fonts (works if bundled next to compiled code)
  // 2. process.cwd()/src/lib/vaultsign/fonts (works in dev and Vercel)
  // 3. /usr/share/fonts/truetype/liberation (system fonts, local dev fallback)
  const possiblePaths = [
    path.join(__dirname, "fonts"),
    path.join(process.cwd(), "src", "lib", "vaultsign", "fonts"),
    "/usr/share/fonts/truetype/liberation",
  ];

  const fontFiles: Record<string, string> = {
    "LiberationSans-Regular.ttf": "LiberationSans-Regular.ttf",
    "LiberationSans-Bold.ttf": "LiberationSans-Bold.ttf",
    "LiberationSans-Italic.ttf": "LiberationSans-Italic.ttf",
    "LiberationSans-BoldItalic.ttf": "LiberationSans-BoldItalic.ttf",
  };

  let fontsLoaded = 0;
  for (const [name, fileName] of Object.entries(fontFiles)) {
    let fontPath: string | null = null;

    // Try each possible path until we find the font file
    for (const basePath of possiblePaths) {
      const candidatePath = path.join(basePath, fileName);
      try {
        if (fs.existsSync(candidatePath)) {
          fontPath = candidatePath;
          break;
        }
      } catch {
        // ignore — path might not be accessible
      }
    }

    if (fontPath) {
      try {
        const data = fs.readFileSync(fontPath);
        vfs.writeFileSync(`${FONT_VFS_PREFIX}/${name}`, data);
        fontsLoaded++;
      } catch (err) {
        console.error(`[VAULTSIGN] Failed to register font ${name}:`, err);
      }
    } else {
      console.error(`[VAULTSIGN] Font not found in any of:`, possiblePaths);
    }
  }

  if (fontsLoaded === 0) {
    console.error("[VAULTSIGN] CRITICAL: No fonts loaded! PDF generation will fail.");
    console.error(`[VAULTSIGN] Tried paths:`, possiblePaths);
  } else {
    console.log(`[VAULTSIGN] Loaded ${fontsLoaded}/4 Liberation Sans fonts`);
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
  // Liberation Sans is metrically identical to Helvetica, but we also
  // map common font names (Times New Roman, Arial, Georgia, Courier New, etc.)
  // to the same Liberation Sans files so documents that reference those
  // fonts don't crash with "Font not defined" errors.
  const liberationFontPaths = {
    normal: `${FONT_VFS_PREFIX}/LiberationSans-Regular.ttf`,
    bold: `${FONT_VFS_PREFIX}/LiberationSans-Bold.ttf`,
    italics: `${FONT_VFS_PREFIX}/LiberationSans-Italic.ttf`,
    bolditalics: `${FONT_VFS_PREFIX}/LiberationSans-BoldItalic.ttf`,
  };

  const fonts: Record<string, typeof liberationFontPaths> = {
    Helvetica: liberationFontPaths,
    Courier: liberationFontPaths,
    // Map all common font names to Liberation Sans to prevent "Font not defined" errors
    "Times New Roman": liberationFontPaths,
    "Times": liberationFontPaths,
    "Arial": liberationFontPaths,
    "Arial Narrow": liberationFontPaths,
    "Georgia": liberationFontPaths,
    "Courier New": liberationFontPaths,
    "Verdana": liberationFontPaths,
    "Tahoma": liberationFontPaths,
    "Trebuchet MS": liberationFontPaths,
    "Calibri": liberationFontPaths,
    "Cambria": liberationFontPaths,
    "Garamond": liberationFontPaths,
    "Default": liberationFontPaths,
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
 * Fetch a remote image URL and convert it to a base64 data URL.
 * pdfmake in Node.js cannot fetch remote URLs — it requires data URLs
 * or local file paths. This function bridges that gap.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.warn(`[VAULTSIGN] Image fetch failed (${response.status})`);
      return null;
    }
    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (err: any) {
    console.warn(`[VAULTSIGN] Image fetch error:`, err.message);
    return null;
  }
}

/**
 * Recursively convert all remote image URLs in a pdfmake doc definition
 * to base64 data URLs. Mutates the object in place.
 */
export async function convertRemoteImages(obj: any): Promise<any> {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = await convertRemoteImages(obj[i]);
    }
    return obj;
  }

  if (obj.image && typeof obj.image === "string" && obj.image.startsWith("http")) {
    const dataUrl = await fetchImageAsDataUrl(obj.image);
    if (dataUrl) {
      obj.image = dataUrl;
    } else {
      delete obj.image;
    }
  }

  for (const key of Object.keys(obj)) {
    obj[key] = await convertRemoteImages(obj[key]);
  }
  return obj;
}

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

  // Convert remote image URLs (logos) to base64 data URLs
  // pdfmake can't fetch remote URLs — needs data URLs
  await convertRemoteImages(docDefinition);

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
