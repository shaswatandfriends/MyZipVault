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
  const M_LEFT = 45;
  const M_RIGHT = 45;
  const M_TOP = 50;
  const M_BOTTOM = 50;
  const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // 522

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
  const totalSkills = data.skills.length;
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

  // ── Column layout ── (no separate N/A column - use badge within rating column)
  const COL_SKILL = M_LEFT;
  const COL_SKILL_W = CONTENT_W * 0.52;
  const COL_RATING = COL_SKILL + COL_SKILL_W;
  const COL_RATING_W = CONTENT_W * 0.48;

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let curY = PAGE_H - M_TOP;
  let pageNum = 1;

  function footer(p: PDFPage, num: number) {
    const fSize = 7;
    const fY = M_BOTTOM - 12;
    // Footer line
    drawHLine(p, M_LEFT, fY + 12, CONTENT_W, C_BORDER, 0.5);
    p.drawText(sanitizeForPdf('MyZipVault - Skills Checklist'), { x: M_LEFT, y: fY, size: fSize, font: fontRegular, color: C_LIGHT });
    p.drawText(`Page ${num}`, { x: PAGE_W - M_RIGHT - fontRegular.widthOfTextAtSize(`Page ${num}`, fSize), y: fY, size: fSize, font: fontRegular, color: C_LIGHT });
  }

  function newPage(): PDFPage {
    footer(page, pageNum);
    pageNum++;
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    curY = PAGE_H - M_TOP;
    // Continuation header - teal bar
    drawRect(page, 0, PAGE_H - 28, PAGE_W, 28, C_BRAND);
    const safeName = sanitizeForPdf(data.checklistName);
    const safeCandidate = sanitizeForPdf(data.candidateName);
    page.drawText(safeName, { x: M_LEFT, y: PAGE_H - 19, size: 8, font: fontBold, color: C_WHITE });
    const nameW = fontRegular.widthOfTextAtSize(safeCandidate, 8);
    page.drawText(safeCandidate, { x: PAGE_W - M_RIGHT - nameW, y: PAGE_H - 19, size: 8, font: fontRegular, color: C_WHITE });
    curY = PAGE_H - 42;
    return page;
  }

  function ensureSpace(needed: number) {
    if (curY - needed < M_BOTTOM + 20) newPage();
  }

  // ═══════════════════════════════════════════════════════════
  // HEADER BANNER - Two-tone with darker accent strip
  // ═══════════════════════════════════════════════════════════
  const bannerH = 52;
  drawRect(page, 0, curY - bannerH, PAGE_W, bannerH, C_BRAND);
  // Darker accent strip at bottom of banner
  drawRect(page, 0, curY - bannerH, PAGE_W, 4, C_BRAND_DARK);

  // Checklist title
  const titleSize = 17;
  page.drawText(sanitizeForPdf(data.checklistName.toUpperCase()), {
    x: M_LEFT + 4,
    y: curY - 24,
    size: titleSize,
    font: fontBold,
    color: C_WHITE,
    maxWidth: CONTENT_W - 8,
  });

  // Subtitle: profession
  if (data.profession) {
    page.drawText(sanitizeForPdf(data.profession), {
      x: M_LEFT + 4,
      y: curY - 40,
      size: 9,
      font: fontRegular,
      color: rgb(200/255, 240/255, 235/255),
      maxWidth: CONTENT_W - 8,
    });
  }
  curY -= bannerH + 14;

  // ═══════════════════════════════════════════════════════════
  // CANDIDATE INFO - Modern card with info fields
  // ═══════════════════════════════════════════════════════════
  const infoCardH = 54;
  const infoFields = [
    { label: 'CANDIDATE', value: data.candidateName },
    { label: 'SPECIALTY', value: data.specialty || 'N/A' },
    { label: 'AGENCY', value: data.agencyName || 'N/A' },
    { label: 'COMPLETED', value: data.completedDate || 'N/A' },
    { label: 'VALID UNTIL', value: data.validUntil || 'N/A' },
  ];
  const infoColW = CONTENT_W / infoFields.length;

  // Card background
  drawRect(page, M_LEFT, curY - infoCardH, CONTENT_W, infoCardH, C_WHITE);
  page.drawRectangle({
    x: M_LEFT, y: curY - infoCardH, width: CONTENT_W, height: infoCardH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });
  // Top accent line
  drawHLine(page, M_LEFT, curY, CONTENT_W, C_BRAND, 1.5);

  // Draw each field
  for (let i = 0; i < infoFields.length; i++) {
    const field = infoFields[i];
    const fx = M_LEFT + i * infoColW;
    // Vertical separator
    if (i > 0) {
      page.drawLine({
        start: { x: fx, y: curY - 6 },
        end: { x: fx, y: curY - infoCardH + 6 },
        thickness: 0.3, color: C_BORDER,
      });
    }
    // Label - more padding from top
    page.drawText(field.label, { x: fx + 10, y: curY - 16, size: 7, font: fontBold, color: C_LIGHT });
    // Value - more padding between label and value, bigger font
    const valText = truncate(field.value, fontBold, 9.5, infoColW - 22);
    page.drawText(valText, { x: fx + 10, y: curY - 36, size: 9.5, font: fontBold, color: C_DARK });
  }
  curY -= infoCardH + 16;

  // ═══════════════════════════════════════════════════════════
  // SCORE SUMMARY DASHBOARD
  // ═══════════════════════════════════════════════════════════
  ensureSpace(80);
  const dashH = 76;
  // Dashboard background
  drawRect(page, M_LEFT, curY - dashH, CONTENT_W, dashH, rgb(248/255, 250/255, 252/255));
  page.drawRectangle({
    x: M_LEFT, y: curY - dashH, width: CONTENT_W, height: dashH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });

  const dashPadTop = 8;
  const dashPadSide = 10;
  const innerH = dashH - dashPadTop * 2; // usable height inside dashboard

  // Left side: Overall Score badge
  const scoreBoxW = 110;
  const scoreBoxH = innerH;
  const scoreBoxX = M_LEFT + dashPadSide;
  const scoreBoxY = curY - dashPadTop - scoreBoxH;

  // Score background - tinted by score level
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

  // Score number - large and prominent
  const scoreStr = `${overallScore}%`;
  const scoreNumSize = 24;
  const scoreNumW = fontBold.widthOfTextAtSize(scoreStr, scoreNumSize);
  page.drawText(scoreStr, {
    x: scoreBoxX + (scoreBoxW - scoreNumW) / 2,
    y: scoreBoxY + scoreBoxH - 30,
    size: scoreNumSize,
    font: fontBold,
    color: scoreColor,
  });
  // "Overall Score" label
  const scoreLabel = 'OVERALL SCORE';
  const scoreLabelW = fontBold.widthOfTextAtSize(scoreLabel, 6.5);
  page.drawText(scoreLabel, {
    x: scoreBoxX + (scoreBoxW - scoreLabelW) / 2,
    y: scoreBoxY + 8,
    size: 6.5,
    font: fontBold,
    color: C_LIGHT,
  });

  // Middle: Proficiency rate
  const profBoxX = scoreBoxX + scoreBoxW + dashPadSide;
  const profBoxW = 90;
  const profBoxH = scoreBoxH;
  const profBoxY = scoreBoxY;

  drawRect(page, profBoxX, profBoxY, profBoxW, profBoxH, C_WHITE);
  page.drawRectangle({
    x: profBoxX, y: profBoxY, width: profBoxW, height: profBoxH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });

  const profStr = `${proficiencyPct}%`;
  const profNumW = fontBold.widthOfTextAtSize(profStr, 18);
  page.drawText(profStr, {
    x: profBoxX + (profBoxW - profNumW) / 2,
    y: profBoxY + profBoxH - 24,
    size: 18,
    font: fontBold,
    color: C_RATE_PROFICIENT,
  });
  const profLabel = 'PROFICIENCY';
  const profLabelW = fontBold.widthOfTextAtSize(profLabel, 6.5);
  page.drawText(profLabel, {
    x: profBoxX + (profBoxW - profLabelW) / 2,
    y: profBoxY + 16,
    size: 6.5,
    font: fontBold,
    color: C_LIGHT,
  });
  const profSubLabel = `${countByRating['4']} of ${totalRated} skills`;
  const profSubW = fontRegular.widthOfTextAtSize(profSubLabel, 6);
  page.drawText(profSubLabel, {
    x: profBoxX + (profBoxW - profSubW) / 2,
    y: profBoxY + 6,
    size: 6,
    font: fontRegular,
    color: C_LIGHT,
  });

  // Right side: Distribution bar chart - properly aligned
  const distX = profBoxX + profBoxW + dashPadSide;
  const distW = PAGE_W - M_RIGHT - distX - dashPadSide;

  // "SKILL DISTRIBUTION" label
  page.drawText('SKILL DISTRIBUTION', { x: distX, y: curY - 12, size: 6.5, font: fontBold, color: C_LIGHT });

  // Distribution bars - consistent vertical alignment
  const distItems = [
    { label: 'Proficient', count: countByRating['4'], color: C_RATE_PROFICIENT },
    { label: 'Experienced', count: countByRating['3'], color: C_RATE_EXPERIENCED },
    { label: 'Limited', count: countByRating['2'], color: C_RATE_LIMITED },
    { label: 'No Exp.', count: countByRating['1'], color: C_RATE_NONE },
  ];

  const barLabelW = 52;   // fixed width for labels
  const barCountW = 20;   // fixed width for count numbers
  const barGapX = 4;
  const barMaxW = distW - barLabelW - barCountW - barGapX * 2;
  const barH = 11;
  const barGapY = 3;

  // Start bars aligned from same Y position
  const barStartY = curY - dashPadTop - 8;

  for (let bi = 0; bi < distItems.length; bi++) {
    const item = distItems[bi];
    const pct = totalRated > 0 ? item.count / totalRated : 0;
    const filledW = Math.max(pct > 0 ? 6 : 0, barMaxW * pct);

    // Y position for this bar (top-to-bottom)
    const by = barStartY - bi * (barH + barGapY);

    // Label - right-aligned within barLabelW
    const labelW = fontRegular.widthOfTextAtSize(item.label, 6.5);
    page.drawText(item.label, {
      x: distX + barLabelW - labelW,
      y: by + 2.5,
      size: 6.5, font: fontRegular, color: C_MEDIUM,
    });

    const barX = distX + barLabelW + barGapX;

    // Background bar
    drawRect(page, barX, by, barMaxW, barH, rgb(229/255, 231/255, 235/255));
    // Filled bar
    if (filledW > 0) {
      drawRect(page, barX, by, filledW, barH, item.color);
    }

    // Count text - left-aligned after bar
    const countText = `${item.count}`;
    page.drawText(countText, {
      x: barX + barMaxW + barGapX,
      y: by + 2.5,
      size: 7,
      font: fontBold,
      color: item.color,
    });
  }

  // N/A count note
  if (totalNa > 0) {
    const naBarY = barStartY - distItems.length * (barH + barGapY);
    const naText = `${totalNa} skill${totalNa > 1 ? 's' : ''} marked N/A`;
    page.drawText(naText, { x: distX, y: naBarY, size: 6, font: fontOblique, color: C_LIGHT });
  }

  curY -= dashH + 16;

  // ═══════════════════════════════════════════════════════════
  // SKILLS TABLE - with color-coded rating bars & badges
  // ═══════════════════════════════════════════════════════════
  const ROW_H = 20;
  const HEADER_H = 24;
  const CAT_H = 22;
  const fTable = 8;
  const fTableHead = 8.5;
  const barPadX = 12;   // horizontal padding inside rating column
  const barH3 = 14;     // rating bar height
  const barOffsetY = (ROW_H - barH3) / 2; // vertically center bar in row

  // Table header row
  ensureSpace(HEADER_H + ROW_H);
  drawRect(page, COL_SKILL, curY - HEADER_H, CONTENT_W, HEADER_H, C_BRAND);
  page.drawText('SKILL', { x: COL_SKILL + 12, y: curY - 16, size: fTableHead, font: fontBold, color: C_WHITE });
  page.drawText('PROFICIENCY LEVEL', { x: COL_RATING + barPadX, y: curY - 16, size: fTableHead, font: fontBold, color: C_WHITE });
  curY -= HEADER_H;

  let rowIndex = 0;

  for (const [category, skills] of categories) {
    // Category row with distinctive styling
    ensureSpace(CAT_H + ROW_H);
    drawRect(page, COL_SKILL, curY - CAT_H, CONTENT_W, CAT_H, C_BRAND_BG);
    // Left accent bar
    drawRect(page, COL_SKILL, curY - CAT_H, 4, CAT_H, C_BRAND);
    page.drawText(truncate(category, fontBold, fTable + 1, CONTENT_W - 20), {
      x: COL_SKILL + 12, y: curY - 15, size: fTable + 1, font: fontBold, color: C_BRAND,
    });
    curY -= CAT_H;
    rowIndex = 0; // reset alternating for each category

    // Skill rows
    for (const skill of skills) {
      ensureSpace(ROW_H + 12);

      // Alternating row background
      if (rowIndex % 2 === 0) {
        drawRect(page, COL_SKILL, curY - ROW_H, CONTENT_W, ROW_H, C_ROW_ALT);
      }

      // Light bottom border
      drawHLine(page, COL_SKILL, curY - ROW_H, CONTENT_W, C_BORDER, 0.3);

      // ── Skill name ──
      const skillLabel = sanitizeForPdf(skill.skillName);
      const skillTextMaxW = COL_SKILL_W - 28;
      if (fontRegular.widthOfTextAtSize(skillLabel, fTable) <= skillTextMaxW) {
        page.drawText(truncate(skill.skillName, fontRegular, fTable, skillTextMaxW), {
          x: COL_SKILL + 12, y: curY - 14, size: fTable, font: fontRegular, color: C_DARK,
        });
      } else {
        // Wrap long skill names
        const lines = wrapText(skillLabel, fontRegular, fTable, skillTextMaxW);
        let ly = curY - 12;
        for (const line of lines.slice(0, 2)) {
          page.drawText(sanitizeForPdf(line), {
            x: COL_SKILL + 12, y: ly, size: fTable, font: fontRegular, color: C_DARK,
          });
          ly -= fTable + 2;
        }
      }

      // ── Rating bar with color-coded fill ──
      const barX = COL_RATING + barPadX;
      const barTotalW = COL_RATING_W - barPadX * 2;
      const barY3 = curY - ROW_H + barOffsetY;

      if (skill.isNa) {
        // N/A badge - centered in rating column
        const naBadgeText = 'N/A';
        const naBadgeW = 40;
        const naBadgeH = barH3;
        const naBadgeX = COL_RATING + (COL_RATING_W - naBadgeW) / 2;
        drawRect(page, naBadgeX, barY3, naBadgeW, naBadgeH, C_BRAND_BG);
        page.drawRectangle({
          x: naBadgeX, y: barY3, width: naBadgeW, height: naBadgeH,
          borderColor: C_BORDER, borderWidth: 0.3,
        });
        const naTextW = fontBold.widthOfTextAtSize(naBadgeText, 7);
        page.drawText(naBadgeText, {
          x: naBadgeX + (naBadgeW - naTextW) / 2,
          y: barY3 + 4,
          size: 7, font: fontBold, color: C_LIGHT,
        });
      } else {
        const ratingVal = skill.rating;
        const ratingLabel = sanitizeForPdf(RATING_LABELS[ratingVal] || skill.rating);
        const rColor = getRatingColor(ratingVal);

        // Light background bar
        drawRect(page, barX, barY3, barTotalW, barH3, rgb(229/255, 231/255, 235/255));
        // Filled portion based on rating level (1=25%, 2=50%, 3=75%, 4=100%)
        const fillPct = parseInt(ratingVal) > 0 ? parseInt(ratingVal) / 4 : 0;
        const fillW = Math.max(8, barTotalW * fillPct);
        drawRect(page, barX, barY3, fillW, barH3, rColor);

        // Rating text centered on the bar
        const rTextW = fontBold.widthOfTextAtSize(ratingLabel, 7);
        page.drawText(ratingLabel, {
          x: barX + (barTotalW - rTextW) / 2,
          y: barY3 + 4,
          size: 7, font: fontBold, color: C_DARK,
        });
      }

      curY -= ROW_H;
      rowIndex++;
    }
  }

  // Table bottom border - thick brand line
  drawHLine(page, COL_SKILL, curY, CONTENT_W, C_BRAND, 2);
  curY -= 20;

  // ═══════════════════════════════════════════════════════════
  // ATTESTATION SECTION
  // ═══════════════════════════════════════════════════════════
  ensureSpace(110);
  // Section header with accent
  drawRect(page, M_LEFT, curY - 20, 4, 20, C_BRAND);
  page.drawText('ATTESTATION', { x: M_LEFT + 10, y: curY - 15, size: 11, font: fontBold, color: C_BRAND });
  curY -= 30;

  // Attestation box with styled border - generous padding
  const attestPadLeft = 18;
  const attestPadRight = 14;
  const attestPadTop = 14;
  const attestPadBottom = 14;
  const attestTextMaxW = CONTENT_W - attestPadLeft - attestPadRight - 4; // 4 for accent bar
  const attestLines = wrapText(sanitizeForPdf(data.attestationText), fontOblique, 8.5, attestTextMaxW);
  const attestBoxH = Math.max(50, attestLines.length * 14 + attestPadTop + attestPadBottom);
  ensureSpace(attestBoxH + 10);
  drawRect(page, M_LEFT, curY - attestBoxH, CONTENT_W, attestBoxH, C_BRAND_BG);
  // Left accent bar for attestation
  drawRect(page, M_LEFT, curY - attestBoxH, 3, attestBoxH, C_BRAND);
  page.drawRectangle({
    x: M_LEFT, y: curY - attestBoxH, width: CONTENT_W, height: attestBoxH,
    borderColor: C_BORDER, borderWidth: 0.5,
  });

  let attestY = curY - attestPadTop;
  for (const line of attestLines) {
    page.drawText(line, { x: M_LEFT + attestPadLeft, y: attestY, size: 8.5, font: fontOblique, color: C_MEDIUM });
    attestY -= 14;
  }
  curY -= attestBoxH + 24;

  // ═══════════════════════════════════════════════════════════
  // SIGNATURE SECTION
  // ═══════════════════════════════════════════════════════════
  ensureSpace(100);
  // Section header with accent
  drawRect(page, M_LEFT, curY - 20, 4, 20, C_BRAND);
  page.drawText('SIGNATURE', { x: M_LEFT + 10, y: curY - 15, size: 11, font: fontBold, color: C_BRAND });
  curY -= 30;

  // Signature line area
  const sigLineW = CONTENT_W * 0.50;
  const sigMetaX = M_LEFT + sigLineW + 30;

  // Embed signature image if available
  if (data.signatureBase64) {
    try {
      const sigData = data.signatureBase64.startsWith('data:')
        ? data.signatureBase64.split(',')[1]
        : data.signatureBase64;
      const sigBytes = Buffer.from(sigData, 'base64');
      const sigImage = await pdfDoc.embedPng(sigBytes).catch(() => pdfDoc.embedJpg(sigBytes));
      const sigDims = sigImage.scale(0.3);
      ensureSpace(sigDims.height + 70);
      page.drawImage(sigImage, { x: M_LEFT + 4, y: curY - sigDims.height, width: sigDims.width, height: sigDims.height });
      curY -= sigDims.height + 6;
    } catch {
      // If signature image fails, draw a signature line
      drawHLine(page, M_LEFT, curY - 30, sigLineW, C_DARK, 1);
      curY -= 36;
    }
  } else {
    drawHLine(page, M_LEFT, curY - 30, sigLineW, C_DARK, 1);
    curY -= 36;
  }

  // Signature details - structured as a compact card with label/value pairs
  const sigDetails = [
    { label: 'Signed by', value: data.signatureName },
    { label: 'Agency', value: data.agencyName || 'N/A' },
  ];

  const sigMetaDetails = [
    { label: 'Date', value: data.signatureDate },
    { label: 'Valid until', value: data.validUntil || 'N/A' },
  ];

  // Left column details
  for (let i = 0; i < sigDetails.length; i++) {
    const item = sigDetails[i];
    const iy = curY - i * 22;
    // Label
    page.drawText(item.label, { x: M_LEFT, y: iy, size: 7, font: fontBold, color: C_LIGHT });
    // Value
    page.drawText(sanitizeForPdf(item.value), { x: M_LEFT, y: iy - 12, size: 9, font: fontBold, color: C_DARK });
  }

  // Right column details
  for (let i = 0; i < sigMetaDetails.length; i++) {
    const item = sigMetaDetails[i];
    const iy = curY - i * 22;
    // Label
    page.drawText(item.label, { x: sigMetaX, y: iy, size: 7, font: fontBold, color: C_LIGHT });
    // Value
    page.drawText(sanitizeForPdf(item.value), { x: sigMetaX, y: iy - 12, size: 9, font: fontBold, color: C_DARK });
  }

  curY -= 60;

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
