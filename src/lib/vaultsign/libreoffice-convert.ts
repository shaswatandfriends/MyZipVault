/**
 * LibreOffice headless DOCX → PDF conversion utility.
 *
 * Uses LibreOffice's command-line interface to convert .docx files to PDF
 * with exact format fidelity — preserving fonts, spacing, page breaks,
 * headers/footers, tables, images, and all OOXML formatting.
 *
 * This bypasses the lossy DOCX → HTML → pdfmake pipeline and produces
 * a PDF that is pixel-perfect compared to opening the .docx in Word.
 */

import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

// Timeout for LibreOffice conversion (30 seconds)
const CONVERSION_TIMEOUT_MS = 30000;

/**
 * Check if LibreOffice is available on the system.
 */
export async function isLibreOfficeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("which", ["libreoffice"], (err) => {
      resolve(!err);
    });
  });
}

/**
 * Convert a DOCX file buffer to PDF using LibreOffice headless.
 *
 * Process:
 * 1. Write DOCX buffer to a temporary file
 * 2. Run `libreoffice --headless --convert-to pdf` in the temp directory
 * 3. Read the generated PDF file
 * 4. Clean up temp files
 *
 * @param docxBuffer - The .docx file content as a Buffer
 * @param options - Optional configuration
 * @returns PDF buffer with exact format fidelity
 */
export async function convertDocxToPdf(
  docxBuffer: Buffer,
  options: {
    /** Custom timeout in milliseconds (default: 30000) */
    timeoutMs?: number;
  } = {}
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs || CONVERSION_TIMEOUT_MS;
  const tmpDir = path.join(os.tmpdir(), `vaultsign-convert-${randomUUID()}`);
  const docxPath = path.join(tmpDir, "input.docx");
  const pdfPath = path.join(tmpDir, "input.pdf");

  try {
    // Create temp directory
    await fs.mkdir(tmpDir, { recursive: true });

    // Write DOCX buffer to temp file
    await fs.writeFile(docxPath, docxBuffer);

    // Run LibreOffice headless conversion
    await runLibreOfficeConversion(tmpDir, docxPath, timeoutMs);

    // Read the generated PDF
    const pdfBuffer = await fs.readFile(pdfPath);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("LibreOffice produced an empty PDF");
    }

    return pdfBuffer;
  } catch (error: any) {
    throw new Error(`LibreOffice DOCX→PDF conversion failed: ${error.message}`);
  } finally {
    // Clean up temp files
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convert a DOCX file at a URL/path to PDF.
 * Downloads the file first, then converts using LibreOffice.
 *
 * @param fileUrl - URL or path to the .docx file
 * @param fetchFn - Function to fetch the file content (for handling signed URLs)
 * @param options - Optional configuration
 * @returns PDF buffer
 */
export async function convertDocxUrlToPdf(
  fileUrl: string,
  fetchFn: (url: string) => Promise<Buffer>,
  options: {
    timeoutMs?: number;
  } = {}
): Promise<Buffer> {
  // Download the DOCX file
  const docxBuffer = await fetchFn(fileUrl);
  return convertDocxToPdf(docxBuffer, options);
}

/**
 * Run LibreOffice headless conversion.
 */
function runLibreOfficeConversion(
  outputDir: string,
  inputFile: string,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "--headless",
      "--convert-to", "pdf",
      "--outdir", outputDir,
      inputFile,
    ];

    const child = execFile(
      "libreoffice",
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large documents
        env: {
          ...process.env,
          // Disable LibreOffice's user profile to avoid lock conflicts
          HOME: os.tmpdir(),
          // Suppress any GUI dialogs
          DISPLAY: "",
          // Use a separate user profile directory to avoid lock conflicts
          USER_PROFILE: path.join(os.tmpdir(), `lo-profile-${randomUUID()}`),
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          // Check if the error is just a timeout
          if (error.killed) {
            reject(new Error(`LibreOffice conversion timed out after ${timeoutMs / 1000}s`));
          } else {
            reject(new Error(`LibreOffice error: ${error.message}\n${stderr}`));
          }
          return;
        }
        resolve();
      }
    );

    // Force-kill if timeout exceeded
    setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
        reject(new Error(`LibreOffice conversion timed out after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs + 2000);
  });
}
