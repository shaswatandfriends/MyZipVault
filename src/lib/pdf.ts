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
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Page dimensions (US Letter)
  const PAGE_W = 612;
  const PAGE_H = 792;
  const M_LEFT = 50;
  const M_RIGHT = 50;
  const M_TOP = 45;
  const M_BOTTOM = 50;
  const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // 512

  // Group skills by category
  const categoryMap = new Map<string, Array<{ skillName: string; rating: string; isNa: boolean }>>();
  for (const skill of data.skills) {
    const list = categoryMap.get(skill.category) || [];
    list.push({ skillName: skill.skillName, rating: skill.rating, isNa: skill.isNa });
    categoryMap.set(skill.category, list);
  }
  const categories = Array.from(categoryMap.entries());

  // Calculate score statistics
  const ratedSkills = data.skills.filter(s => !s.isNa);
  const totalRated = ratedSkills.length;
  const totalNa = data.skills.filter(s => s.isNa).length;

  const countByRating: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };
  let sumRatings = 0;
  for (const s of ratedSkills) {
    const r = s.rating;
    if (countByRating[r] !== undefined) countByRating[r]++;
    sumRatings += parseInt(r) || 0;
  }
  const overallScore = totalRated > 0 ? Math.round((sumRatings / (totalRated * 4)) * 100) : 0;
  const proficiencyPct = totalRated > 0 ? Math.round((countByRating['4'] / totalRated) * 100) : 0;

  // ── Column layout ──
  const COL_SKILL = M_LEFT;
  const COL_SKILL_W = CONTENT_W * 0.55;
  const COL_RATING = COL_SKILL + COL_SKILL_W;
  const COL_RATING_W = CONTENT_W * 0.45;

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let curY = PAGE_H - M_TOP;
  let pageNum = 1;

  function footer(p: PDFPage, num: number) {
    const fSize = 7;
    const fY = M_BOTTOM - 15;
    drawHLine(p, M_LEFT, fY + 14, CONTENT_W, C_BORDER, 0.5);
    p.drawText(sanitizeForPdf('MyZipVault - Skills Checklist'), { x: M_LEFT, y: fY, size: fSize, font: fontRegular, color: C_LIGHT });
    p.drawText(`Page ${num}`, { x: PAGE_W - M_RIGHT - fontRegular.widthOfTextAtSize(`Page ${num}`, fSize), y: fY, size: fSize, font: fontRegular, color: C_LIGHT });
  }

  function newPage(): PDFPage {
    footer(page, pageNum);
    pageNum++;
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    curY = PAGE_H - M_TOP;
    drawRect(page, 0, PAGE_H - 30, PAGE_W, 30, C_BRAND);
    const safeName = sanitizeForPdf(data.checklistName);
    const safeCandidate = sanitizeForPdf(data.candidateName);
    page.drawText(safeName, { x: M_LEFT, y: PAGE_H - 20, size: 8, font: fontBold, color: C_WHITE });
    const nameW = fontRegular.widthOfTextAtSize(safeCandidate, 8);
    page.drawText(safeCandidate, { x: PAGE_W - M_RIGHT - nameW, y: PAGE_H - 20, size: 8, font: fontRegular, color: C_WHITE });
    curY = PAGE_H - 44;
    return page;
  }

  function ensureSpace(needed: number) {
    if (curY - needed < M_BOTTOM + 25) newPage();
  }

  // ═══════════════════════════════════════════════════════════
  // HEADER BANNER
  // ═══════════════════════════════════════════════════════════
  const bannerH = 56;
  drawRect(page, 0, curY - bannerH, PAGE_W, bannerH, C_BRAND);
  drawRect(page, 0, curY - bannerH, PAGE_W, 4, C_BRAND_DARK);

  const titleSize = 16;
  page.drawText(sanitizeForPdf(data.checklistName.toUpperCase()), {
    x: M_LEFT + 6,
    y: curY - 25,
    size: titleSize,
    font: fontBold,
    color: C_WHITE,
    maxWidth: CONTENT_W - 12,
  });

  if (data.profession) {
    page.drawText(sanitizeForPdf(data.profession), {
      x: M_LEFT + 6,
      y: curY - 42,
      size: 9,
      font: fontRegular,
      color: rgb(200/255, 240/255, 235/255),
      maxWidth: CONTENT_W - 12,
    });
  }
  curY -= bannerH + 16;

  // ═══════════════════════════════════════════════════════════
  // CANDIDATE INFO - 2-row layout: Row 1 = 3 wider fields, Row 2 = 2 fields
  // ═══════════════════════════════════════════════════════════
  const infoRow1 = [
    { label: 'CANDIDATE', value: data.candidateName },
    { label: 'SPECIALTY', value: data.specialty || 'N/A' },
    { label: 'AGENCY', value: data.agencyName || 'N/A' },
  ];
  const infoRow2 = [
    { label: 'COMPLETED', value: data.completedDate || 'N/A' },
    { label: 'VALID UNTIL', value: data.validUntil || 'N/A' },
  ];

  const infoRowH = 34;
  const infoTotalH = infoRowH * 2 + 2; // 2 rows + tiny gap

  // Card background
  drawRect(page, M_LEFT, curY - infoTotalH, CONTENT_W, infoTotalH, C_WHITE);
  page.drawRectangle({
    x: M_LEFT, y: curY - infoTotalH, width: CONTENT_W, height: infoTotalH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });
  drawHLine(page, M_LEFT, curY, CONTENT_W, C_BRAND, 2);

  // Row 1 - 3 columns
  const row1ColW = CONTENT_W / 3;
  for (let i = 0; i < infoRow1.length; i++) {
    const field = infoRow1[i];
    const fx = M_LEFT + i * row1ColW;
    if (i > 0) {
      page.drawLine({
        start: { x: fx, y: curY - 4 },
        end: { x: fx, y: curY - infoRowH + 4 },
        thickness: 0.3, color: C_BORDER,
      });
    }
    // Label
    page.drawText(field.label, { x: fx + 12, y: curY - 12, size: 7, font: fontBold, color: C_LIGHT });
    // Value with wrapping support for long text
    const valMaxW = row1ColW - 24;
    const valSafe = sanitizeForPdf(field.value);
    if (fontBold.widthOfTextAtSize(valSafe, 9.5) <= valMaxW) {
      page.drawText(valSafe, { x: fx + 12, y: curY - 25, size: 9.5, font: fontBold, color: C_DARK });
    } else {
      // Wrap value text into 2 lines
      const valLines = wrapText(valSafe, fontBold, 9, valMaxW);
      let vy = curY - 22;
      for (const vLine of valLines.slice(0, 2)) {
        page.drawText(vLine, { x: fx + 12, y: vy, size: 9, font: fontBold, color: C_DARK });
        vy -= 11;
      }
    }
  }

  // Horizontal separator between rows
  drawHLine(page, M_LEFT + 4, curY - infoRowH, CONTENT_W - 8, C_BORDER, 0.3);

  // Row 2 - 2 columns
  const row2ColW = CONTENT_W / 2;
  const row2Top = curY - infoRowH - 2;
  for (let i = 0; i < infoRow2.length; i++) {
    const field = infoRow2[i];
    const fx = M_LEFT + i * row2ColW;
    if (i > 0) {
      page.drawLine({
        start: { x: fx, y: row2Top - 4 },
        end: { x: fx, y: row2Top - infoRowH + 4 },
        thickness: 0.3, color: C_BORDER,
      });
    }
    page.drawText(field.label, { x: fx + 12, y: row2Top - 12, size: 7, font: fontBold, color: C_LIGHT });
    page.drawText(sanitizeForPdf(field.value), { x: fx + 12, y: row2Top - 25, size: 9.5, font: fontBold, color: C_DARK });
  }

  curY -= infoTotalH + 18;

  // ═══════════════════════════════════════════════════════════
  // SCORE SUMMARY DASHBOARD
  // ═══════════════════════════════════════════════════════════
  ensureSpace(90);
  const dashH = 82;
  drawRect(page, M_LEFT, curY - dashH, CONTENT_W, dashH, rgb(248/255, 250/255, 252/255));
  page.drawRectangle({
    x: M_LEFT, y: curY - dashH, width: CONTENT_W, height: dashH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });

  const dashPad = 12;
  const innerH = dashH - dashPad * 2;

  // Left: Overall Score badge
  const scoreBoxW = 110;
  const scoreBoxH = innerH;
  const scoreBoxX = M_LEFT + dashPad;
  const scoreBoxY = curY - dashPad - scoreBoxH;

  const scoreColor = overallScore >= 75 ? C_RATE_PROFICIENT
    : overallScore >= 50 ? C_RATE_EXPERIENCED
    : overallScore >= 25 ? C_RATE_LIMITED
    : C_RATE_NONE;
  const scoreBgColor = overallScore >= 75 ? C_BG_PROFICIENT
    : overallScore >= 50 ? C_BG_EXPERIENCED
    : overallScore >= 25 ? C_BG_LIMITED
    : C_BG_NONE;

  drawRect(page, scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, scoreBgColor);
  page.drawRectangle({
    x: scoreBoxX, y: scoreBoxY, width: scoreBoxW, height: scoreBoxH,
    borderColor: scoreColor, borderWidth: 1,
  });

  const scoreStr = `${overallScore}%`;
  const scoreNumSize = 26;
  const scoreNumW = fontBold.widthOfTextAtSize(scoreStr, scoreNumSize);
  page.drawText(scoreStr, {
    x: scoreBoxX + (scoreBoxW - scoreNumW) / 2,
    y: scoreBoxY + scoreBoxH - 32,
    size: scoreNumSize, font: fontBold, color: scoreColor,
  });
  const scoreLabel = 'OVERALL SCORE';
  const scoreLabelW = fontBold.widthOfTextAtSize(scoreLabel, 7);
  page.drawText(scoreLabel, {
    x: scoreBoxX + (scoreBoxW - scoreLabelW) / 2,
    y: scoreBoxY + 10,
    size: 7, font: fontBold, color: C_LIGHT,
  });

  // Middle: Proficiency rate
  const profBoxX = scoreBoxX + scoreBoxW + dashPad;
  const profBoxW = 90;
  const profBoxH = scoreBoxH;
  const profBoxY = scoreBoxY;

  drawRect(page, profBoxX, profBoxY, profBoxW, profBoxH, C_WHITE);
  page.drawRectangle({
    x: profBoxX, y: profBoxY, width: profBoxW, height: profBoxH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });

  const profStr = `${proficiencyPct}%`;
  const profNumW = fontBold.widthOfTextAtSize(profStr, 20);
  page.drawText(profStr, {
    x: profBoxX + (profBoxW - profNumW) / 2,
    y: profBoxY + profBoxH - 26,
    size: 20, font: fontBold, color: C_RATE_PROFICIENT,
  });
  const profLabel = 'PROFICIENCY';
  const profLabelW = fontBold.widthOfTextAtSize(profLabel, 7);
  page.drawText(profLabel, {
    x: profBoxX + (profBoxW - profLabelW) / 2,
    y: profBoxY + 18,
    size: 7, font: fontBold, color: C_LIGHT,
  });
  const profSubLabel = `${countByRating['4']} of ${totalRated} skills`;
  const profSubW = fontRegular.widthOfTextAtSize(profSubLabel, 6.5);
  page.drawText(profSubLabel, {
    x: profBoxX + (profBoxW - profSubW) / 2,
    y: profBoxY + 7,
    size: 6.5, font: fontRegular, color: C_LIGHT,
  });

  // Right: Distribution bar chart
  const distX = profBoxX + profBoxW + dashPad;
  const distW = PAGE_W - M_RIGHT - distX - dashPad;

  page.drawText('SKILL DISTRIBUTION', { x: distX, y: curY - 13, size: 7, font: fontBold, color: C_LIGHT });

  const distItems = [
    { label: 'Proficient', count: countByRating['4'], color: C_RATE_PROFICIENT },
    { label: 'Experienced', count: countByRating['3'], color: C_RATE_EXPERIENCED },
    { label: 'Limited', count: countByRating['2'], color: C_RATE_LIMITED },
    { label: 'No Exp.', count: countByRating['1'], color: C_RATE_NONE },
  ];

  const barLabelW = 56;
  const barGapX = 5;
  const barMaxW = distW - barLabelW - 22 - barGapX * 2;
  const barH = 12;
  const barGapY = 4;
  const barStartY = curY - dashPad - 10;

  for (let bi = 0; bi < distItems.length; bi++) {
    const item = distItems[bi];
    const pct = totalRated > 0 ? item.count / totalRated : 0;
    const filledW = Math.max(pct > 0 ? 6 : 0, barMaxW * pct);
    const by = barStartY - bi * (barH + barGapY);

    const labelW = fontRegular.widthOfTextAtSize(item.label, 7);
    page.drawText(item.label, {
      x: distX + barLabelW - labelW,
      y: by + 3,
      size: 7, font: fontRegular, color: C_MEDIUM,
    });

    const barX = distX + barLabelW + barGapX;
    drawRect(page, barX, by, barMaxW, barH, rgb(229/255, 231/255, 235/255));
    if (filledW > 0) {
      drawRect(page, barX, by, filledW, barH, item.color);
    }

    page.drawText(`${item.count}`, {
      x: barX + barMaxW + barGapX,
      y: by + 3,
      size: 7.5, font: fontBold, color: item.color,
    });
  }

  if (totalNa > 0) {
    const naBarY = barStartY - distItems.length * (barH + barGapY);
    page.drawText(`${totalNa} skill${totalNa > 1 ? 's' : ''} marked N/A`, { x: distX, y: naBarY, size: 6.5, font: fontOblique, color: C_LIGHT });
  }

  curY -= dashH + 18;

  // ═══════════════════════════════════════════════════════════
  // SKILLS TABLE - dynamic row height for wrapped text
  // ═══════════════════════════════════════════════════════════
  const BASE_ROW_H = 22;
  const LINE_H = 11;       // height per additional text line
  const HEADER_H = 26;
  const CAT_H = 24;
  const fTable = 8;
  const fTableHead = 8.5;
  const barPadX = 14;
  const ratingBarH = 14;
  const skillTextMaxW = COL_SKILL_W - 30;
  const skillPadX = 14;

  // Table header row
  ensureSpace(HEADER_H + BASE_ROW_H);
  drawRect(page, COL_SKILL, curY - HEADER_H, CONTENT_W, HEADER_H, C_BRAND);
  // Header text vertically centered
  page.drawText('SKILL', { x: COL_SKILL + skillPadX, y: curY - 17, size: fTableHead, font: fontBold, color: C_WHITE });
  page.drawText('PROFICIENCY LEVEL', { x: COL_RATING + barPadX, y: curY - 17, size: fTableHead, font: fontBold, color: C_WHITE });
  curY -= HEADER_H;

  let rowIndex = 0;

  for (const [category, skills] of categories) {
    ensureSpace(CAT_H + BASE_ROW_H);
    drawRect(page, COL_SKILL, curY - CAT_H, CONTENT_W, CAT_H, C_BRAND_BG);
    drawRect(page, COL_SKILL, curY - CAT_H, 4, CAT_H, C_BRAND);
    page.drawText(truncate(category, fontBold, fTable + 1, CONTENT_W - 22), {
      x: COL_SKILL + skillPadX, y: curY - 16, size: fTable + 1, font: fontBold, color: C_BRAND,
    });
    curY -= CAT_H;
    rowIndex = 0;

    for (const skill of skills) {
      // Calculate dynamic row height based on text wrapping
      const skillLabel = sanitizeForPdf(skill.skillName);
      const wrappedLines = wrapText(skillLabel, fontRegular, fTable, skillTextMaxW);
      const lineCount = Math.min(wrappedLines.length, 3); // cap at 3 lines
      const rowH = Math.max(BASE_ROW_H, 10 + lineCount * LINE_H + 4);

      ensureSpace(rowH + 10);

      // Alternating row background
      if (rowIndex % 2 === 0) {
        drawRect(page, COL_SKILL, curY - rowH, CONTENT_W, rowH, C_ROW_ALT);
      }
      drawHLine(page, COL_SKILL, curY - rowH, CONTENT_W, C_BORDER, 0.3);

      // ── Skill name with proper multi-line wrapping ──
      let textY = curY - 12;
      for (let li = 0; li < Math.min(wrappedLines.length, 3); li++) {
        page.drawText(wrappedLines[li], {
          x: COL_SKILL + skillPadX,
          y: textY,
          size: fTable,
          font: fontRegular,
          color: C_DARK,
        });
        textY -= LINE_H;
      }

      // ── Rating bar ──
      const barX = COL_RATING + barPadX;
      const barTotalW = COL_RATING_W - barPadX * 2;
      const barOffsetY = (rowH - ratingBarH) / 2;
      const barY3 = curY - rowH + barOffsetY;

      if (skill.isNa) {
        const naBadgeText = 'N/A';
        const naBadgeW = 42;
        const naBadgeH = ratingBarH;
        const naBadgeX = COL_RATING + (COL_RATING_W - naBadgeW) / 2;
        drawRect(page, naBadgeX, barY3, naBadgeW, naBadgeH, C_BRAND_BG);
        page.drawRectangle({
          x: naBadgeX, y: barY3, width: naBadgeW, height: naBadgeH,
          borderColor: C_BORDER, borderWidth: 0.3,
        });
        const naTextW = fontBold.widthOfTextAtSize(naBadgeText, 7);
        page.drawText(naBadgeText, {
          x: naBadgeX + (naBadgeW - naTextW) / 2,
          y: barY3 + 4.5,
          size: 7, font: fontBold, color: C_LIGHT,
        });
      } else {
        const ratingVal = skill.rating;
        const ratingLabel = sanitizeForPdf(RATING_LABELS[ratingVal] || skill.rating);
        const rColor = getRatingColor(ratingVal);

        drawRect(page, barX, barY3, barTotalW, ratingBarH, rgb(229/255, 231/255, 235/255));
        const fillPct = parseInt(ratingVal) > 0 ? parseInt(ratingVal) / 4 : 0;
        const fillW = Math.max(8, barTotalW * fillPct);
        drawRect(page, barX, barY3, fillW, ratingBarH, rColor);

        const rTextW = fontBold.widthOfTextAtSize(ratingLabel, 7);
        page.drawText(ratingLabel, {
          x: barX + (barTotalW - rTextW) / 2,
          y: barY3 + 4.5,
          size: 7, font: fontBold, color: C_DARK,
        });
      }

      curY -= rowH;
      rowIndex++;
    }
  }

  // Table bottom border
  drawHLine(page, COL_SKILL, curY, CONTENT_W, C_BRAND, 2);
  curY -= 22;

  // ═══════════════════════════════════════════════════════════
  // ATTESTATION SECTION
  // ═══════════════════════════════════════════════════════════
  ensureSpace(120);
  drawRect(page, M_LEFT, curY - 22, 4, 22, C_BRAND);
  page.drawText('ATTESTATION', { x: M_LEFT + 12, y: curY - 16, size: 11, font: fontBold, color: C_BRAND });
  curY -= 32;

  const attestPadLeft = 20;
  const attestPadRight = 16;
  const attestPadTop = 16;
  const attestPadBottom = 16;
  const attestLineH = 13;
  const attestTextMaxW = CONTENT_W - attestPadLeft - attestPadRight - 4;
  const attestLines = wrapText(sanitizeForPdf(data.attestationText), fontOblique, 8.5, attestTextMaxW);
  const attestBoxH = Math.max(55, attestLines.length * attestLineH + attestPadTop + attestPadBottom);
  ensureSpace(attestBoxH + 10);
  drawRect(page, M_LEFT, curY - attestBoxH, CONTENT_W, attestBoxH, C_BRAND_BG);
  drawRect(page, M_LEFT, curY - attestBoxH, 3, attestBoxH, C_BRAND);
  page.drawRectangle({
    x: M_LEFT, y: curY - attestBoxH, width: CONTENT_W, height: attestBoxH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });

  let attestY = curY - attestPadTop;
  for (const line of attestLines) {
    page.drawText(line, { x: M_LEFT + attestPadLeft, y: attestY, size: 8.5, font: fontOblique, color: C_MEDIUM });
    attestY -= attestLineH;
  }
  curY -= attestBoxH + 24;

  // ═══════════════════════════════════════════════════════════
  // SIGNATURE SECTION - proper layout with aligned details
  // ═══════════════════════════════════════════════════════════
  // Estimate signature section height
  let sigImageH = 0;
  let sigImageObj: any = null;
  let sigImageW = 0;
  if (data.signatureBase64) {
    try {
      const sigData = data.signatureBase64.startsWith('data:')
        ? data.signatureBase64.split(',')[1]
        : data.signatureBase64;
      const sigBytes = Buffer.from(sigData, 'base64');
      sigImageObj = await pdfDoc.embedPng(sigBytes).catch(() => pdfDoc.embedJpg(sigBytes));
      const sigDims = sigImageObj.scale(0.35);
      sigImageW = Math.min(sigDims.width, CONTENT_W * 0.45);
      sigImageH = sigDims.height * (sigImageW / sigDims.width);
    } catch {
      sigImageObj = null;
    }
  }

  const sigDetailH = 50; // height for the signature detail block below image/line
  const sigTotalH = Math.max(sigImageH, 30) + 10 + sigDetailH + 10;
  ensureSpace(sigTotalH + 40);

  // Section header
  drawRect(page, M_LEFT, curY - 22, 4, 22, C_BRAND);
  page.drawText('SIGNATURE', { x: M_LEFT + 12, y: curY - 16, size: 11, font: fontBold, color: C_BRAND });
  curY -= 34;

  // Signature image or line - left-aligned
  const sigLineW = CONTENT_W * 0.45;
  const sigTopY = curY;

  if (sigImageObj) {
    page.drawImage(sigImageObj, {
      x: M_LEFT,
      y: curY - sigImageH,
      width: sigImageW,
      height: sigImageH,
    });
    curY -= sigImageH;
  } else {
    drawHLine(page, M_LEFT, curY - 25, sigLineW, C_DARK, 1);
    curY -= 30;
  }

  // Signature line under image
  drawHLine(page, M_LEFT, curY - 2, sigLineW, C_DARK, 0.5);
  page.drawText('Signature', { x: M_LEFT + 2, y: curY - 12, size: 7, font: fontRegular, color: C_LIGHT });
  curY -= 20;

  // Detail grid: 2 columns x 2 rows
  const detailCol1X = M_LEFT;
  const detailCol2X = M_LEFT + CONTENT_W * 0.5;
  const detailRowH = 22;
  const detailLabelSize = 7;
  const detailValueSize = 9;

  const sigDetailsGrid = [
    [
      { label: 'Signed By', value: data.signatureName },
      { label: 'Date', value: data.signatureDate },
    ],
    [
      { label: 'Agency', value: data.agencyName || 'N/A' },
      { label: 'Valid Until', value: data.validUntil || 'N/A' },
    ],
  ];

  for (let ri = 0; ri < sigDetailsGrid.length; ri++) {
    const row = sigDetailsGrid[ri];
    const rowY = curY - ri * detailRowH;

    // Left column
    page.drawText(row[0].label, { x: detailCol1X, y: rowY, size: detailLabelSize, font: fontBold, color: C_LIGHT });
    page.drawText(sanitizeForPdf(row[0].value), { x: detailCol1X, y: rowY - 12, size: detailValueSize, font: fontBold, color: C_DARK });

    // Right column
    page.drawText(row[1].label, { x: detailCol2X, y: rowY, size: detailLabelSize, font: fontBold, color: C_LIGHT });
    page.drawText(sanitizeForPdf(row[1].value), { x: detailCol2X, y: rowY - 12, size: detailValueSize, font: fontBold, color: C_DARK });
  }

  curY -= sigDetailsGrid.length * detailRowH + 8;

  // Finalize — add footer to last page
  footer(page, pageNum);

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
