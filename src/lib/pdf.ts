// pdfmake has ESM/CJS compatibility issues with Turbopack, so we use dynamic import
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

let printerInstance: any = null;

async function getPrinter(): Promise<any> {
  if (printerInstance) return printerInstance;

  try {
    // Dynamic import to handle ESM/CJS compatibility
    const pdfmake = await import('pdfmake');
    const PdfPrinter = pdfmake.default || pdfmake;

    let vfs: any;
    try {
      const vfsFontsModule = await import('pdfmake/build/vfs_fonts');
      vfs =
        (vfsFontsModule as any).default?.pdfMake?.vfs ||
        (vfsFontsModule as any).pdfMake?.vfs ||
        (vfsFontsModule as any).default ||
        vfsFontsModule;
    } catch {
      // vfs_fonts might not be available in some bundling environments
      console.warn('pdfmake/build/vfs_fonts import failed, PDF generation may not work');
      vfs = {};
    }

    const fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    };

    const printer = new PdfPrinter(fonts);
    printer.vfs = vfs;
    printerInstance = printer;
    return printerInstance;
  } catch (error) {
    console.error('Failed to initialize pdfmake printer:', error);
    throw new Error('PDF generation is currently unavailable. Please try again later.');
  }
}

const BRAND_COLOR = '#0f766e';
const BRAND_LIGHT = '#f0fdfa';
const TEXT_DARK = '#1a1a1a';
const TEXT_MEDIUM = '#4a4a4a';
const TEXT_LIGHT = '#6b7280';
const BORDER_COLOR = '#d1d5db';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function createHeader(title: string): any[] {
  return [
    {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 515,
          h: 50,
          color: BRAND_COLOR,
        },
      ],
    },
    {
      text: title,
      style: 'headerTitle',
      absolutePosition: { x: 40, y: 14 },
    },
    { text: '', margin: [0, 10] },
  ];
}

function createBrandLine(): any {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 2,
        lineColor: BRAND_COLOR,
      },
    ],
    margin: [0, 0, 0, 15],
  };
}

async function pdfDocToBuffer(docDefinition: any): Promise<Buffer> {
  const printer = await getPrinter();
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));
    doc.end();
  });
}

const baseStyles: any = {
  headerTitle: {
    fontSize: 22,
    bold: true,
    color: '#ffffff',
  },
  subHeader: {
    fontSize: 16,
    bold: true,
    color: BRAND_COLOR,
    margin: [0, 0, 0, 8],
  },
  sectionHeader: {
    fontSize: 13,
    bold: true,
    color: BRAND_COLOR,
    margin: [0, 12, 0, 6],
  },
  bodyText: {
    fontSize: 10,
    color: TEXT_DARK,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 9,
    color: TEXT_LIGHT,
    bold: true,
    margin: [0, 0, 0, 2],
  },
  value: {
    fontSize: 10,
    color: TEXT_DARK,
    margin: [0, 0, 0, 8],
  },
  smallText: {
    fontSize: 8,
    color: TEXT_LIGHT,
  },
  footer: {
    fontSize: 8,
    color: TEXT_LIGHT,
    alignment: 'center',
  },
};

// ─────────────────────────────────────────────────────────────
// 1. BAA (Business Associate Agreement)
// ─────────────────────────────────────────────────────────────

export async function generateBaaPdf(data: {
  organizationName: string;
  signerName: string;
  signerTitle: string;
  baaContent: string;
  signedAt: Date;
}): Promise<Buffer> {
  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [60, 80, 60, 60],
    styles: baseStyles,
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return {};
      return {
        columns: [
          { text: 'Business Associate Agreement', style: 'smallText', alignment: 'left', margin: [60, 20, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'smallText', alignment: 'right', margin: [0, 20, 60, 0] },
        ],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Business Associate Agreement', style: 'footer', margin: [60, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', margin: [0, 0, 60, 0], alignment: 'right' },
        ],
        margin: [0, 20, 0, 0],
      };
    },
    content: [
      // Brand header
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 495, h: 50, color: BRAND_COLOR },
        ],
        margin: [0, 0, 0, 0],
      },
      {
        text: 'BUSINESS ASSOCIATE AGREEMENT',
        fontSize: 22,
        bold: true,
        color: '#ffffff',
        absolutePosition: { x: 60, y: 14 },
      },
      { text: '', margin: [0, 20] },

      // Parties section
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'THIS AGREEMENT ENTERED INTO BY:', style: 'label' },
                  { text: data.organizationName, style: 'value', bold: true, fontSize: 12 },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 8, 8, 8],
              },
              {
                stack: [
                  { text: 'DATE EXECUTED:', style: 'label' },
                  { text: formatDate(data.signedAt), style: 'value', bold: true, fontSize: 12 },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 8, 8, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 20],
      },

      // BAA Content
      { text: data.baaContent, style: 'bodyText', margin: [0, 0, 0, 30] },

      // Signature block
      createBrandLine(),
      { text: 'SIGNATURE', style: 'sectionHeader', margin: [0, 0, 0, 20] },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'Signed By', style: 'label' },
                  { text: data.signerName, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 12],
              },
              {
                stack: [
                  { text: 'Title', style: 'label' },
                  { text: data.signerTitle, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 12],
              },
            ],
            [
              {
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 0, 0, 4] },
                  { text: 'Signature', style: 'smallText' },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 12],
              },
              {
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 0, 0, 4] },
                  { text: 'Date', style: 'smallText' },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 12],
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
    ],
  };

  return pdfDocToBuffer(docDefinition);
}

// ─────────────────────────────────────────────────────────────
// 2. Invoice
// ─────────────────────────────────────────────────────────────

export async function generateInvoicePdf(data: {
  invoiceNumber: string;
  agencyName: string;
  creditAmount: number;
  pricePerCredit: number;
  totalPrice: number;
  date: Date;
}): Promise<Buffer> {
  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [60, 60, 60, 60],
    styles: baseStyles,
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Invoice', style: 'footer', margin: [60, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', margin: [0, 0, 60, 0], alignment: 'right' },
        ],
        margin: [0, 20, 0, 0],
      };
    },
    content: [
      // Header with branding
      {
        columns: [
          {
            stack: [
              { text: 'MyZipVault', fontSize: 28, bold: true, color: BRAND_COLOR },
              { text: 'Healthcare Credentialing Solutions', fontSize: 10, color: TEXT_LIGHT, margin: [0, 2, 0, 0] },
            ],
            width: '*',
          },
          {
            stack: [
              { text: 'INVOICE', fontSize: 24, bold: true, color: BRAND_COLOR, alignment: 'right' },
            ],
            width: 'auto',
          },
        ],
        margin: [0, 0, 0, 5],
      },
      createBrandLine(),

      // Invoice details
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'Bill To:', style: 'label' },
                  { text: data.agencyName, bold: true, fontSize: 13, color: TEXT_DARK, margin: [0, 2, 0, 0] },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 10],
              },
              {
                stack: [
                  {
                    table: {
                      widths: ['auto', 'auto'],
                      body: [
                        [{ text: 'Invoice #:', style: 'label', margin: [0, 0, 15, 0] }, { text: data.invoiceNumber, bold: true, fontSize: 10, color: TEXT_DARK }],
                        [{ text: 'Date:', style: 'label', margin: [0, 4, 15, 0] }, { text: formatDate(data.date), fontSize: 10, color: TEXT_DARK, margin: [0, 4, 0, 0] }],
                      ],
                    },
                    layout: 'noBorders',
                    alignment: 'right',
                  },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 10],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20],
      },

      // Line items table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            // Header row
            [
              { text: 'Description', style: 'tableHeader', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 10, margin: [8, 8, 8, 8] },
              { text: 'Qty', style: 'tableHeader', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 10, alignment: 'center', margin: [8, 8, 8, 8] },
              { text: 'Unit Price', style: 'tableHeader', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 10, alignment: 'right', margin: [8, 8, 8, 8] },
              { text: 'Amount', style: 'tableHeader', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 10, alignment: 'right', margin: [8, 8, 8, 8] },
            ],
            // Data row
            [
              { text: 'Credential Verification Credits', fontSize: 10, color: TEXT_DARK, margin: [8, 8, 8, 8] },
              { text: data.creditAmount.toString(), fontSize: 10, color: TEXT_DARK, alignment: 'center', margin: [8, 8, 8, 8] },
              { text: `$${data.pricePerCredit.toFixed(2)}`, fontSize: 10, color: TEXT_DARK, alignment: 'right', margin: [8, 8, 8, 8] },
              { text: `$${(data.creditAmount * data.pricePerCredit).toFixed(2)}`, fontSize: 10, color: TEXT_DARK, alignment: 'right', margin: [8, 8, 8, 8] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1) ? BRAND_COLOR : BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 0],
      },

      // Totals
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: '', border: [false, false, false, false] },
              { text: '', border: [false, false, false, false] },
            ],
            [
              { text: 'Subtotal:', fontSize: 10, color: TEXT_MEDIUM, alignment: 'right', margin: [0, 4, 10, 4], border: [false, false, false, false] },
              { text: `$${(data.creditAmount * data.pricePerCredit).toFixed(2)}`, fontSize: 10, color: TEXT_DARK, alignment: 'right', margin: [0, 4, 0, 4], border: [false, false, false, false] },
            ],
            [
              { text: 'Total Due:', fontSize: 12, bold: true, color: BRAND_COLOR, alignment: 'right', margin: [0, 4, 10, 4], border: [false, false, false, false] },
              { text: `$${data.totalPrice.toFixed(2)}`, fontSize: 12, bold: true, color: BRAND_COLOR, alignment: 'right', margin: [0, 4, 0, 4], border: [false, false, false, false] },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 30],
      },

      createBrandLine(),

      // Payment terms
      {
        stack: [
          { text: 'Payment Terms', style: 'sectionHeader' },
          { text: 'Payment is due upon receipt of this invoice. Please include the invoice number with your payment.', style: 'bodyText' },
          { text: '', margin: [0, 8] },
          { text: 'Thank you for your business!', style: 'bodyText', bold: true, color: BRAND_COLOR, italics: true },
        ],
        margin: [0, 0, 0, 0],
      },
    ],
  };

  return pdfDocToBuffer(docDefinition);
}


// ─────────────────────────────────────────────────────────────
// 3. Checklist PDF  (pdf-lib — works reliably on Vercel)
// ─────────────────────────────────────────────────────────────

/**
 * pdf-lib standard fonts only support WinAnsi encoding (roughly Latin-1 + Windows extensions).
 * Any character outside that range will crash drawText(). This function replaces unsupported
 * characters with safe ASCII equivalents so PDF generation never throws.
 */
function sanitizeForPdf(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .replace(/\u2013/g, '-')            // en dash
    .replace(/\u2015/g, '-')            // horizontal bar
    .replace(/\u2026/g, '...')          // ellipsis
    .replace(/\u2022/g, '-')            // bullet
    .replace(/[\u2713\u2714]/g, 'X')   // checkmarks
    .replace(/[\u00A0]/g, ' ')          // non-breaking space
    // Remove any remaining characters outside WinAnsi (0x80-0xFF range is OK for WinAnsi)
    .replace(/[^\x20-\x7E\x80-\xFF]/g, '?');
}

const RATING_LABELS: Record<string, string> = {
  '1': 'No Experience',
  '2': 'Limited Experience',
  '3': 'Experienced',
  '4': 'Proficient',
};

// Colour constants for pdf-lib (rgb 0-1)
const C_BRAND      = rgb(15/255, 118/255, 110/255);    // #0f766e teal
const C_BRAND_DARK = rgb(10/255, 80/255, 74/255);      // #0a504a darker teal
const C_BRAND_BG   = rgb(240/255, 253/255, 250/255);   // #f0fdfa light teal bg
const C_DARK       = rgb(26/255, 26/255, 26/255);       // #1a1a1a
const C_MEDIUM     = rgb(74/255, 74/255, 74/255);        // #4a4a4a
const C_LIGHT      = rgb(107/255, 114/255, 128/255);     // #6b7280
const C_BORDER     = rgb(209/255, 213/255, 219/255);     // #d1d5db
const C_WHITE      = rgb(1, 1, 1);
const C_ROW_ALT    = rgb(249/255, 250/255, 251/255);     // #f9fafb very light gray

// Rating colours
const C_RATE_PROFICIENT  = rgb(16/255, 185/255, 129/255);  // #10b981 green
const C_RATE_EXPERIENCED = rgb(59/255, 130/255, 246/255);  // #3b82f6 blue
const C_RATE_LIMITED     = rgb(245/255, 158/255, 11/255);  // #f59e0b amber
const C_RATE_NONE        = rgb(239/255, 68/255, 68/255);   // #ef4444 red

// Rating badge background colours (lighter tints)
const C_BG_PROFICIENT  = rgb(209/255, 250/255, 229/255);   // #d1fae5
const C_BG_EXPERIENCED = rgb(219/255, 234/255, 254/255);   // #dbeafe
const C_BG_LIMITED     = rgb(254/255, 243/255, 199/255);   // #fef3c7
const C_BG_NONE        = rgb(254/255, 226/255, 226/255);   // #fee2e2

function getRatingColor(rating: string) {
  switch (rating) {
    case '4': return C_RATE_PROFICIENT;
    case '3': return C_RATE_EXPERIENCED;
    case '2': return C_RATE_LIMITED;
    case '1': return C_RATE_NONE;
    default: return C_LIGHT;
  }
}

function getRatingBgColor(rating: string) {
  switch (rating) {
    case '4': return C_BG_PROFICIENT;
    case '3': return C_BG_EXPERIENCED;
    case '2': return C_BG_LIMITED;
    case '1': return C_BG_NONE;
    default: return C_BRAND_BG;
  }
}

/** Helper: draw text, return the new Y position */
function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color: any = C_DARK,
  opts?: { bold?: boolean; maxWidth?: number; align?: 'left' | 'center' | 'right' }
): number {
  const options: any = { size, color, font };
  if (opts?.maxWidth) options.maxWidth = opts.maxWidth;
  page.drawText(text, { x, y, ...options });
  return y - size * 1.4;
}

/** Draw a filled rectangle */
function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: any) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

/** Draw a horizontal line */
function drawHLine(page: PDFPage, x: number, y: number, w: number, color: any = C_BORDER, thickness = 0.5) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness, color });
}

/** Word-wrap text into lines that fit maxWidth */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Truncate text with ellipsis if wider than maxWidth */
function truncate(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const safe = sanitizeForPdf(text);
  if (font.widthOfTextAtSize(safe, fontSize) <= maxWidth) return safe;
  let t = safe;
  while (t.length > 0 && font.widthOfTextAtSize(t + '...', fontSize) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

export async function generateChecklistPdf(data: {
  candidateName: string;
  specialty: string;
  checklistName: string;
  profession?: string;
  agencyName?: string;
  recruiterName?: string;
  completedDate: string;
  validUntil?: string;
  skills: Array<{ category: string; skillName: string; rating: string; isNa: boolean }>;
  attestationText: string;
  signatureName: string;
  signatureDate: string;
  signatureBase64?: string;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fItal = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PW = 612, PH = 792;
  const ML = 50, MR = 50, MT = 45, MB = 50;
  const CW = PW - ML - MR; // 512

  // ── Stats ──
  const rated = data.skills.filter(s => !s.isNa);
  const totalRated = rated.length;
  const totalNa = data.skills.filter(s => s.isNa).length;
  const cnt: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };
  let sum = 0;
  for (const s of rated) { if (cnt[s.rating] !== undefined) cnt[s.rating]++; sum += parseInt(s.rating) || 0; }
  const score = totalRated > 0 ? Math.round(sum / (totalRated * 4) * 100) : 0;
  const profPct = totalRated > 0 ? Math.round(cnt['4'] / totalRated * 100) : 0;

  // Group by category
  const catMap = new Map<string, typeof data.skills>();
  for (const s of data.skills) {
    const list = catMap.get(s.category) || [];
    list.push(s);
    catMap.set(s.category, list);
  }

  // ── Helpers ──
  function s(text: string) { return sanitizeForPdf(text); }
  function tw(font: PDFFont, text: string, size: number) { return font.widthOfTextAtSize(s(text), size); }
  function centerIn(text: string, font: PDFFont, size: number, leftX: number, width: number) {
    return leftX + (width - tw(font, text, size)) / 2;
  }
  function vCenterText(topY: number, boxH: number, fontSize: number) {
    // Y coordinate to vertically center text of given fontSize inside a box
    // text baseline sits at this Y; box top is topY, box height is boxH
    return topY - (boxH + fontSize * 0.7) / 2;
  }

  // ── Page management ──
  let page = pdfDoc.addPage([PW, PH]);
  let y = PH - MT;
  let pn = 1;

  function addFooter() {
    const fy = MB - 15;
    drawHLine(page, ML, fy + 12, CW, C_BORDER, 0.5);
    page.drawText(s('MyZipVault - Skills Checklist'), { x: ML, y: fy, size: 7, font: fReg, color: C_LIGHT });
    page.drawText(`Page ${pn}`, { x: PW - MR - tw(fReg, `Page ${pn}`, 7), y: fy, size: 7, font: fReg, color: C_LIGHT });
  }

  function newPage() {
    addFooter();
    pn++;
    page = pdfDoc.addPage([PW, PH]);
    // Continuation header
    drawRect(page, 0, PH - 32, PW, 32, C_BRAND);
    page.drawText(s(data.checklistName), { x: ML, y: PH - 21, size: 8, font: fBold, color: C_WHITE });
    page.drawText(s(data.candidateName), { x: PW - MR - tw(fReg, data.candidateName, 8), y: PH - 21, size: 8, font: fReg, color: C_WHITE });
    y = PH - 46;
  }

  function need(h: number) { if (y - h < MB + 20) newPage(); }

  // ══════════════════════════════════════════════════════════════
  // 1. HEADER BANNER
  // ══════════════════════════════════════════════════════════════
  const bannerH = 54;
  drawRect(page, 0, y - bannerH, PW, bannerH, C_BRAND);
  drawRect(page, 0, y - bannerH, PW, 4, C_BRAND_DARK);
  page.drawText(s(data.checklistName.toUpperCase()), {
    x: ML, y: vCenterText(y, bannerH - (data.profession ? 14 : 0), 16),
    size: 16, font: fBold, color: C_WHITE, maxWidth: CW - 16,
  });
  if (data.profession) {
    page.drawText(s(data.profession), {
      x: ML, y: y - bannerH + 10, size: 8.5, font: fReg,
      color: rgb(200/255, 240/255, 235/255), maxWidth: CW - 16,
    });
  }
  y -= bannerH + 14;

  // ══════════════════════════════════════════════════════════════
  // 2. CANDIDATE INFO CARD  — 2 rows × clean grid
  // ══════════════════════════════════════════════════════════════
  const fields = [
    { label: 'CANDIDATE', value: data.candidateName },
    { label: 'SPECIALTY', value: data.specialty || 'N/A' },
    { label: 'AGENCY', value: data.agencyName || 'N/A' },
    { label: 'COMPLETED', value: data.completedDate || 'N/A' },
    { label: 'VALID UNTIL', value: data.validUntil || 'N/A' },
  ];

  // Layout: Row1 = 3 cols, Row2 = 2 cols
  const row1Fields = fields.slice(0, 3);
  const row2Fields = fields.slice(3, 5);
  const infoRowH = 36;
  const infoGap = 2;
  const infoH = infoRowH * 2 + infoGap;

  drawRect(page, ML, y - infoH, CW, infoH, C_WHITE);
  page.drawRectangle({ x: ML, y: y - infoH, width: CW, height: infoH, borderColor: C_BORDER, borderWidth: 0.5 });
  drawHLine(page, ML, y, CW, C_BRAND, 2); // top accent

  // Draw a single info field at given position
  function drawInfoField(label: string, value: string, fx: number, fw: number, ftopY: number) {
    const padX = 10;
    const labelY = ftopY - 13;
    const valueY = ftopY - 27;
    page.drawText(label, { x: fx + padX, y: labelY, size: 7, font: fBold, color: C_LIGHT });
    const valSafe = s(value);
    const maxValW = fw - padX * 2;
    if (tw(fBold, value, 9.5) <= maxValW) {
      page.drawText(valSafe, { x: fx + padX, y: valueY, size: 9.5, font: fBold, color: C_DARK });
    } else {
      const lines = wrapText(valSafe, fBold, 9, maxValW);
      let vy = valueY + 2;
      for (const ln of lines.slice(0, 2)) {
        page.drawText(ln, { x: fx + padX, y: vy, size: 9, font: fBold, color: C_DARK });
        vy -= 10;
      }
    }
  }

  // Row 1
  const r1cw = CW / 3;
  for (let i = 0; i < row1Fields.length; i++) {
    const f = row1Fields[i];
    const fx = ML + i * r1cw;
    if (i > 0) page.drawLine({ start: { x: fx, y: y - 5 }, end: { x: fx, y: y - infoRowH + 5 }, thickness: 0.3, color: C_BORDER });
    drawInfoField(f.label, f.value, fx, r1cw, y);
  }
  // Separator
  drawHLine(page, ML + 5, y - infoRowH, CW - 10, C_BORDER, 0.3);
  // Row 2
  const r2top = y - infoRowH - infoGap;
  const r2cw = CW / 2;
  for (let i = 0; i < row2Fields.length; i++) {
    const f = row2Fields[i];
    const fx = ML + i * r2cw;
    if (i > 0) page.drawLine({ start: { x: fx, y: r2top - 5 }, end: { x: fx, y: r2top - infoRowH + 5 }, thickness: 0.3, color: C_BORDER });
    drawInfoField(f.label, f.value, fx, r2cw, r2top);
  }

  y -= infoH + 16;

  // ══════════════════════════════════════════════════════════════
  // 3. SCORE DASHBOARD
  // ══════════════════════════════════════════════════════════════
  need(88);
  const dh = 84;
  const dp = 12; // dashboard padding
  drawRect(page, ML, y - dh, CW, dh, rgb(248/255, 250/255, 252/255));
  page.drawRectangle({ x: ML, y: y - dh, width: CW, height: dh, borderColor: C_BORDER, borderWidth: 0.5 });

  const ih = dh - dp * 2; // inner height

  // ── Overall Score badge ──
  const sbW = 108, sbX = ML + dp, sbY = y - dp - ih;
  const sc = score >= 75 ? C_RATE_PROFICIENT : score >= 50 ? C_RATE_EXPERIENCED : score >= 25 ? C_RATE_LIMITED : C_RATE_NONE;
  const sbg = score >= 75 ? C_BG_PROFICIENT : score >= 50 ? C_BG_EXPERIENCED : score >= 25 ? C_BG_LIMITED : C_BG_NONE;
  drawRect(page, sbX, sbY, sbW, ih, sbg);
  page.drawRectangle({ x: sbX, y: sbY, width: sbW, height: ih, borderColor: sc, borderWidth: 1 });
  const scStr = `${score}%`;
  page.drawText(scStr, { x: centerIn(scStr, fBold, 28, sbX, sbW), y: vCenterText(sbY + ih * 0.58, ih * 0.55, 28), size: 28, font: fBold, color: sc });
  const olLabel = 'OVERALL SCORE';
  page.drawText(olLabel, { x: centerIn(olLabel, fBold, 6.5, sbX, sbW), y: sbY + 8, size: 6.5, font: fBold, color: C_LIGHT });

  // ── Proficiency badge ──
  const pbX = sbX + sbW + dp, pbW = 86, pbY = sbY;
  drawRect(page, pbX, pbY, pbW, ih, C_WHITE);
  page.drawRectangle({ x: pbX, y: pbY, width: pbW, height: ih, borderColor: C_BORDER, borderWidth: 0.5 });
  const pfStr = `${profPct}%`;
  page.drawText(pfStr, { x: centerIn(pfStr, fBold, 22, pbX, pbW), y: vCenterText(pbY + ih * 0.55, ih * 0.5, 22), size: 22, font: fBold, color: C_RATE_PROFICIENT });
  const pfLabel = 'PROFICIENCY';
  page.drawText(pfLabel, { x: centerIn(pfLabel, fBold, 7, pbX, pbW), y: pbY + 16, size: 7, font: fBold, color: C_LIGHT });
  const pfSub = `${cnt['4']} of ${totalRated} skills`;
  page.drawText(pfSub, { x: centerIn(pfSub, fReg, 6.5, pbX, pbW), y: pbY + 6, size: 6.5, font: fReg, color: C_LIGHT });

  // ── Distribution chart ──
  const dcX = pbX + pbW + dp;
  const dcW = PW - MR - dcX - dp;
  page.drawText('SKILL DISTRIBUTION', { x: dcX, y: y - 12, size: 7, font: fBold, color: C_LIGHT });

  const dist = [
    { label: 'Proficient', count: cnt['4'], color: C_RATE_PROFICIENT },
    { label: 'Experienced', count: cnt['3'], color: C_RATE_EXPERIENCED },
    { label: 'Limited', count: cnt['2'], color: C_RATE_LIMITED },
    { label: 'No Exp.', count: cnt['1'], color: C_RATE_NONE },
  ];
  const dlw = 58, dgx = 5, bH = 12, bgy = 4;
  const bMaxW = dcW - dlw - 20 - dgx * 2;
  const bsY = y - dp - 8;
  for (let i = 0; i < dist.length; i++) {
    const d = dist[i];
    const pct = totalRated > 0 ? d.count / totalRated : 0;
    const fw2 = Math.max(pct > 0 ? 6 : 0, bMaxW * pct);
    const by = bsY - i * (bH + bgy);
    page.drawText(d.label, { x: dcX + dlw - tw(fReg, d.label, 7), y: by + 3, size: 7, font: fReg, color: C_MEDIUM });
    const bx = dcX + dlw + dgx;
    drawRect(page, bx, by, bMaxW, bH, rgb(229/255, 231/255, 235/255));
    if (fw2 > 0) drawRect(page, bx, by, fw2, bH, d.color);
    page.drawText(`${d.count}`, { x: bx + bMaxW + dgx, y: by + 3, size: 7.5, font: fBold, color: d.color });
  }
  if (totalNa > 0) {
    page.drawText(`${totalNa} skill${totalNa > 1 ? 's' : ''} marked N/A`, {
      x: dcX, y: bsY - dist.length * (bH + bgy), size: 6.5, font: fItal, color: C_LIGHT,
    });
  }

  y -= dh + 16;

  // ══════════════════════════════════════════════════════════════
  // 4. SKILLS TABLE — dynamic row heights with proper text layout
  // ══════════════════════════════════════════════════════════════
  const COL_SW = CW * 0.55;   // skill column width
  const COL_RW = CW * 0.45;   // rating column width
  const COL_SX = ML;           // skill column X
  const COL_RX = ML + COL_SW;  // rating column X
  const T_PAD = 10;            // text horizontal padding inside columns
  const R_BAR_H = 14;          // rating bar height
  const T_SIZE = 8;            // table text size
  const T_HEAD_H = 26;         // table header height
  const T_CAT_H = 24;          // category row height
  const T_BASE_ROW = 22;       // base row height (single line)
  const T_LINE_H = 11;         // extra height per wrapped line

  // Table header
  need(T_HEAD_H + T_BASE_ROW);
  drawRect(page, COL_SX, y - T_HEAD_H, CW, T_HEAD_H, C_BRAND);
  page.drawText('SKILL', { x: COL_SX + T_PAD, y: vCenterText(y, T_HEAD_H, 8.5), size: 8.5, font: fBold, color: C_WHITE });
  page.drawText('PROFICIENCY LEVEL', { x: COL_RX + T_PAD, y: vCenterText(y, T_HEAD_H, 8.5), size: 8.5, font: fBold, color: C_WHITE });
  y -= T_HEAD_H;

  let rowIdx = 0;
  for (const [cat, skills] of catMap) {
    // Category row
    need(T_CAT_H + T_BASE_ROW);
    drawRect(page, COL_SX, y - T_CAT_H, CW, T_CAT_H, C_BRAND_BG);
    drawRect(page, COL_SX, y - T_CAT_H, 4, T_CAT_H, C_BRAND);
    page.drawText(truncate(cat, fBold, 9, CW - 24), {
      x: COL_SX + T_PAD, y: vCenterText(y, T_CAT_H, 9), size: 9, font: fBold, color: C_BRAND,
    });
    y -= T_CAT_H;
    rowIdx = 0;

    for (const skill of skills) {
      // Compute wrapped text and row height
      const safeName = s(skill.skillName);
      const maxTextW = COL_SW - T_PAD * 2;
      const lines = wrapText(safeName, fReg, T_SIZE, maxTextW);
      const numLines = Math.min(lines.length, 3);
      const rowH = Math.max(T_BASE_ROW, 8 + numLines * T_LINE_H + 6);

      need(rowH + 8);

      // Alternating bg
      if (rowIdx % 2 === 0) drawRect(page, COL_SX, y - rowH, CW, rowH, C_ROW_ALT);
      drawHLine(page, COL_SX, y - rowH, CW, C_BORDER, 0.3);

      // ── Skill name (multi-line, top-aligned with padding) ──
      const firstLineY = y - (rowH - (numLines * T_LINE_H)) / 2 - T_SIZE * 0.8;
      let ly = firstLineY;
      for (let li = 0; li < numLines; li++) {
        page.drawText(lines[li], { x: COL_SX + T_PAD, y: ly, size: T_SIZE, font: fReg, color: C_DARK });
        ly -= T_LINE_H;
      }

      // ── Rating bar (vertically centered in row) ──
      const rBarX = COL_RX + T_PAD;
      const rBarW = COL_RW - T_PAD * 2;
      const rBarY = y - rowH + (rowH - R_BAR_H) / 2;

      if (skill.isNa) {
        const naW = 42;
        const naX = COL_RX + (COL_RW - naW) / 2;
        drawRect(page, naX, rBarY, naW, R_BAR_H, C_BRAND_BG);
        page.drawRectangle({ x: naX, y: rBarY, width: naW, height: R_BAR_H, borderColor: C_BORDER, borderWidth: 0.3 });
        page.drawText('N/A', { x: centerIn('N/A', fBold, 7, naX, naW), y: vCenterText(rBarY, R_BAR_H, 7), size: 7, font: fBold, color: C_LIGHT });
      } else {
        const rv = skill.rating;
        const rl = s(RATING_LABELS[rv] || rv);
        const rc = getRatingColor(rv);
        const fillPct = parseInt(rv) > 0 ? parseInt(rv) / 4 : 0;
        const fillW = Math.max(8, rBarW * fillPct);
        drawRect(page, rBarX, rBarY, rBarW, R_BAR_H, rgb(229/255, 231/255, 235/255));
        drawRect(page, rBarX, rBarY, fillW, R_BAR_H, rc);
        page.drawText(rl, { x: centerIn(rl, fBold, 7, rBarX, rBarW), y: vCenterText(rBarY, R_BAR_H, 7), size: 7, font: fBold, color: C_DARK });
      }

      y -= rowH;
      rowIdx++;
    }
  }

  // Table bottom border
  drawHLine(page, COL_SX, y, CW, C_BRAND, 2);
  y -= 20;

  // ══════════════════════════════════════════════════════════════
  // 5. ATTESTATION
  // ══════════════════════════════════════════════════════════════
  const attMaxW = CW - 40;
  const attLines = wrapText(s(data.attestationText), fItal, 8.5, attMaxW);
  const attLineH = 13;
  const attPadT = 16, attPadB = 16, attPadL = 22, attPadR = 16;
  const attBoxH = Math.max(55, attLines.length * attLineH + attPadT + attPadB);
  need(attBoxH + 50);

  // Section header
  drawRect(page, ML, y - 20, 4, 20, C_BRAND);
  page.drawText('ATTESTATION', { x: ML + 12, y: vCenterText(y, 20, 11), size: 11, font: fBold, color: C_BRAND });
  y -= 28;

  // Attestation box
  drawRect(page, ML, y - attBoxH, CW, attBoxH, C_BRAND_BG);
  drawRect(page, ML, y - attBoxH, 3, attBoxH, C_BRAND);
  page.drawRectangle({ x: ML, y: y - attBoxH, width: CW, height: attBoxH, borderColor: C_BORDER, borderWidth: 0.5 });

  let attY = y - attPadT;
  for (const ln of attLines) {
    page.drawText(ln, { x: ML + attPadL, y: attY, size: 8.5, font: fItal, color: C_MEDIUM });
    attY -= attLineH;
  }
  y -= attBoxH + 20;

  // ══════════════════════════════════════════════════════════════
  // 6. SIGNATURE SECTION
  // ══════════════════════════════════════════════════════════════

  // Pre-load signature image
  let sigImg: any = null, sigImgW = 0, sigImgH = 0;
  if (data.signatureBase64) {
    try {
      const raw = data.signatureBase64.startsWith('data:') ? data.signatureBase64.split(',')[1] : data.signatureBase64;
      const bytes = Buffer.from(raw, 'base64');
      sigImg = await pdfDoc.embedPng(bytes).catch(() => pdfDoc.embedJpg(bytes));
      const dims = sigImg.scale(0.35);
      sigImgW = Math.min(dims.width, CW * 0.42);
      sigImgH = dims.height * (sigImgW / dims.width);
    } catch { sigImg = null; }
  }

  // Calculate total signature block height
  const sigLineW = CW * 0.42;
  const sigImgBlock = Math.max(sigImgH, 28);  // image or blank line space
  const sigUnderLineH = 14;                     // "Signature" label under line
  const sigDetailBlockH = 50;                    // 2-row detail grid
  const sigTotalH = 26 + sigImgBlock + 6 + sigUnderLineH + 8 + sigDetailBlockH;
  need(sigTotalH);

  // Section header
  drawRect(page, ML, y - 20, 4, 20, C_BRAND);
  page.drawText('SIGNATURE', { x: ML + 12, y: vCenterText(y, 20, 11), size: 11, font: fBold, color: C_BRAND });
  y -= 30;

  // Left side: signature image or line + label
  const sigLeftX = ML;
  if (sigImg) {
    page.drawImage(sigImg, { x: sigLeftX, y: y - sigImgH, width: sigImgW, height: sigImgH });
    y -= sigImgH;
  } else {
    y -= 22;
    drawHLine(page, sigLeftX, y, sigLineW, C_DARK, 1);
    y -= 8;
  }

  // Signature line
  drawHLine(page, sigLeftX, y, sigLineW, C_DARK, 0.5);
  page.drawText('Signature', { x: sigLeftX + 2, y: y - 10, size: 7, font: fReg, color: C_LIGHT });
  y -= 18;

  // Detail grid — 2 columns × 2 rows, clean label/value pairs
  const grid = [
    { l1: 'Signed By', v1: data.signatureName, l2: 'Date', v2: data.signatureDate },
    { l1: 'Agency', v1: data.agencyName || 'N/A', l2: 'Valid Until', v2: data.validUntil || 'N/A' },
  ];
  const col2X = ML + CW * 0.5;
  const gridRowH = 24;

  for (let ri = 0; ri < grid.length; ri++) {
    const r = grid[ri];
    const ry = y - ri * gridRowH;
    // Left column
    page.drawText(r.l1, { x: ML, y: ry, size: 7, font: fBold, color: C_LIGHT });
    page.drawText(s(r.v1), { x: ML, y: ry - 12, size: 9, font: fBold, color: C_DARK });
    // Right column
    page.drawText(r.l2, { x: col2X, y: ry, size: 7, font: fBold, color: C_LIGHT });
    page.drawText(s(r.v2), { x: col2X, y: ry - 12, size: 9, font: fBold, color: C_DARK });
  }

  y -= grid.length * gridRowH;

  // Footer on last page
  addFooter();

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─────────────────────────────────────────────────────────────
// 4. Reference PDF
// ─────────────────────────────────────────────────────────────

export async function generateReferencePdf(data: {
  nurseName: string;
  managerName: string;
  facility: string;
  employmentStatus: string;
  questions: Array<{ question: string; answer: string }>;
  overallComment: string;
  signatureName: string;
  signatureDate: string;
  attestationText: string;
}): Promise<Buffer> {
  // Build Q&A table body
  const qaBody: any[] = [
    [
      { text: '#', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
      { text: 'Question', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, margin: [6, 6, 6, 6] },
      { text: 'Response', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, margin: [6, 6, 6, 6] },
    ],
  ];

  data.questions.forEach((q, i) => {
    qaBody.push([
      { text: (i + 1).toString(), fontSize: 9, color: TEXT_DARK, alignment: 'center', margin: [6, 5, 6, 5] },
      { text: q.question, fontSize: 9, color: TEXT_DARK, margin: [6, 5, 6, 5] },
      { text: q.answer, fontSize: 9, color: TEXT_DARK, margin: [6, 5, 6, 5] },
    ]);
  });

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [50, 70, 50, 60],
    styles: baseStyles,
    header: (currentPage: number) => {
      if (currentPage === 1) return {};
      return {
        columns: [
          { text: 'Professional Reference', style: 'smallText', alignment: 'left', margin: [50, 20, 0, 0] },
          { text: data.nurseName, style: 'smallText', alignment: 'right', margin: [0, 20, 50, 0] },
        ],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Professional Reference', style: 'footer', margin: [50, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', margin: [0, 0, 50, 0], alignment: 'right' },
        ],
        margin: [0, 20, 0, 0],
      };
    },
    content: [
      // Header
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 515, h: 45, color: BRAND_COLOR },
        ],
      },
      {
        text: 'PROFESSIONAL REFERENCE',
        fontSize: 20,
        bold: true,
        color: '#ffffff',
        absolutePosition: { x: 50, y: 12 },
      },
      { text: '', margin: [0, 10] },

      // Info section
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'Nurse / Candidate', style: 'label' },
                  { text: data.nurseName, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Employment Status', style: 'label' },
                  { text: data.employmentStatus, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 6, 8, 6],
              },
            ],
            [
              {
                stack: [
                  { text: 'Reference Manager', style: 'label' },
                  { text: data.managerName, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Facility', style: 'label' },
                  { text: data.facility, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 16],
      },

      // Q&A table
      { text: 'EVALUATION QUESTIONS & RESPONSES', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*'],
          body: qaBody,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i <= 1) ? BRAND_COLOR : BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 16],
      },

      // Overall comment
      { text: 'OVERALL COMMENT', style: 'sectionHeader' },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: data.overallComment || 'No comment provided.',
                fontSize: 10,
                color: TEXT_DARK,
                lineHeight: 1.5,
                margin: [10, 10, 10, 10],
                border: [true, true, true, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 16],
      },

      // Attestation
      createBrandLine(),
      { text: 'ATTESTATION', style: 'sectionHeader' },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: data.attestationText,
                fontSize: 9,
                color: TEXT_MEDIUM,
                lineHeight: 1.5,
                italics: true,
                margin: [10, 10, 10, 10],
                border: [true, true, true, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 20],
      },

      // Signature
      {
        columns: [
          {
            width: '*',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 0, 0, 4] },
              { text: `Signed by: ${data.signatureName}`, fontSize: 9, color: TEXT_MEDIUM },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: `Date: ${data.signatureDate}`, fontSize: 9, color: TEXT_MEDIUM },
            ],
            alignment: 'right',
          },
        ],
      },
    ],
  };

  return pdfDocToBuffer(docDefinition);
}

// ─────────────────────────────────────────────────────────────
// 5. Resume PDF
// ─────────────────────────────────────────────────────────────

export async function generateResumePdf(data: {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: Array<{ title: string; company: string; dates: string; description: string }>;
  education: Array<{ degree: string; school: string; year: string }>;
  skills: string[];
  certifications: string[];
}): Promise<Buffer> {
  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [60, 50, 60, 50],
    styles: {
      ...baseStyles,
      nameTitle: {
        fontSize: 26,
        bold: true,
        color: BRAND_COLOR,
        margin: [0, 0, 0, 4],
      },
      contactInfo: {
        fontSize: 10,
        color: TEXT_MEDIUM,
        margin: [0, 0, 0, 2],
      },
      experienceTitle: {
        fontSize: 12,
        bold: true,
        color: TEXT_DARK,
        margin: [0, 0, 0, 2],
      },
      experienceCompany: {
        fontSize: 10,
        color: BRAND_COLOR,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      experienceDates: {
        fontSize: 9,
        color: TEXT_LIGHT,
        margin: [0, 0, 0, 4],
      },
      experienceDesc: {
        fontSize: 10,
        color: TEXT_MEDIUM,
        lineHeight: 1.4,
        margin: [0, 0, 0, 0],
      },
      listItem: {
        fontSize: 10,
        color: TEXT_DARK,
        margin: [0, 2, 0, 2],
      },
    },
    content: [
      // Name
      { text: data.name, style: 'nameTitle' },

      // Contact info
      {
        columns: [
          { text: data.email, style: 'contactInfo' },
          { text: '|', style: 'contactInfo', width: 'auto', margin: [8, 0, 8, 0] },
          { text: data.phone, style: 'contactInfo' },
        ],
        margin: [0, 0, 0, 12],
      },

      createBrandLine(),

      // Summary
      { text: 'PROFESSIONAL SUMMARY', style: 'sectionHeader' },
      { text: data.summary, style: 'bodyText', margin: [0, 0, 0, 10] },

      // Skills
      { text: 'SKILLS', style: 'sectionHeader' },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: data.skills.join('  •  '),
                fontSize: 10,
                color: TEXT_DARK,
                lineHeight: 1.5,
                margin: [10, 8, 10, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 10],
        fillColor: BRAND_LIGHT,
      },

      // Experience
      { text: 'WORK EXPERIENCE', style: 'sectionHeader' },
      ...data.experience.flatMap((exp) => [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: exp.title, style: 'experienceTitle' },
                { text: exp.company, style: 'experienceCompany' },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: exp.dates, style: 'experienceDates', alignment: 'right' },
              ],
            },
          ],
          margin: [0, 0, 0, 2],
        },
        { text: exp.description, style: 'experienceDesc', margin: [0, 0, 0, 12] },
      ]),

      // Education
      { text: 'EDUCATION', style: 'sectionHeader' },
      ...data.education.map((edu) => ({
        columns: [
          {
            width: '*',
            stack: [
              { text: edu.degree, bold: true, fontSize: 11, color: TEXT_DARK },
              { text: edu.school, fontSize: 10, color: TEXT_MEDIUM },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: edu.year, fontSize: 10, color: TEXT_LIGHT, alignment: 'right' },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      })),

      // Certifications
      ...(data.certifications.length > 0
        ? [
            { text: 'CERTIFICATIONS', style: 'sectionHeader' },
            {
              ul: data.certifications.map((c) => ({
                text: c,
                style: 'listItem',
              })),
              margin: [0, 0, 0, 10],
            },
          ]
        : []),
    ],
  };

  return pdfDocToBuffer(docDefinition);
}
