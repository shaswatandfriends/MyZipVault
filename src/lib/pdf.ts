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

const RATING_LABELS: Record<string, string> = {
  '1': 'No Experience',
  '2': 'Limited Experience',
  '3': 'Experienced',
  '4': 'Proficient',
};

// Colour constants for pdf-lib (rgb 0-1)
const C_BRAND     = rgb(15/255, 118/255, 110/255);   // #0f766e
const C_BRAND_BG  = rgb(240/255, 253/255, 250/255);   // #f0fdfa
const C_DARK      = rgb(26/255, 26/255, 26/255);      // #1a1a1a
const C_MEDIUM    = rgb(74/255, 74/255, 74/255);       // #4a4a4a
const C_LIGHT     = rgb(107/255, 114/255, 128/255);    // #6b7280
const C_BORDER    = rgb(209/255, 213/255, 219/255);    // #d1d5db
const C_WHITE     = rgb(1, 1, 1);

/** Helper: draw text, return the new Y position */
function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color: Parameters<PDFPage['drawText']>[1]['color'] = C_DARK,
  opts?: { bold?: boolean; maxWidth?: number; align?: 'left' | 'center' | 'right' }
): number {
  const options: any = { size, color, font };
  if (opts?.maxWidth) options.maxWidth = opts.maxWidth;
  page.drawText(text, { x, y, ...options });
  return y - size * 1.4;
}

/** Draw a filled rectangle */
function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: Parameters<PDFPage['drawRectangle']>[1]['color']) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

/** Draw a horizontal line */
function drawHLine(page: PDFPage, x: number, y: number, w: number, color: Parameters<PDFPage['drawLine']>[1]['color'] = C_BORDER, thickness = 0.5) {
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
  const M_TOP = 60;
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

  // ── Column layout ──
  const COL_SKILL = M_LEFT;
  const COL_SKILL_W = CONTENT_W * 0.60;
  const COL_RATING = COL_SKILL + COL_SKILL_W;
  const COL_RATING_W = CONTENT_W * 0.25;
  const COL_NA = COL_RATING + COL_RATING_W;
  const COL_NA_W = CONTENT_W * 0.15;

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let curY = PAGE_H - M_TOP;
  let pageNum = 1;

  function footer(p: PDFPage, num: number) {
    const fSize = 7;
    const fY = M_BOTTOM - 15;
    p.drawText('MyZipVault — Skills Checklist', { x: M_LEFT, y: fY, size: fSize, font: fontRegular, color: C_LIGHT });
    p.drawText(`Page ${num}`, { x: PAGE_W - M_RIGHT - fontRegular.widthOfTextAtSize(`Page ${num}`, fSize), y: fY, size: fSize, font: fontRegular, color: C_LIGHT });
  }

  function newPage(): PDFPage {
    footer(page, pageNum);
    pageNum++;
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    curY = PAGE_H - M_TOP;
    // Continuation header
    page.drawText(data.checklistName, { x: M_LEFT, y: PAGE_H - 30, size: 8, font: fontRegular, color: C_LIGHT });
    const nameW = fontRegular.widthOfTextAtSize(data.candidateName, 8);
    page.drawText(data.candidateName, { x: PAGE_W - M_RIGHT - nameW, y: PAGE_H - 30, size: 8, font: fontRegular, color: C_LIGHT });
    curY = PAGE_H - M_TOP - 10;
    return page;
  }

  function ensureSpace(needed: number) {
    if (curY - needed < M_BOTTOM + 10) newPage();
  }

  // ── HEADER BANNER ──
  drawRect(page, 0, curY - 45, PAGE_W, 50, C_BRAND);
  const titleSize = 18;
  page.drawText(data.checklistName.toUpperCase(), {
    x: M_LEFT,
    y: curY - 30,
    size: titleSize,
    font: fontBold,
    color: C_WHITE,
    maxWidth: CONTENT_W,
  });
  curY -= 60;

  // ── CANDIDATE INFO ──
  const infoBoxH = 40;
  const col3 = CONTENT_W / 3;
  // Background
  drawRect(page, M_LEFT, curY - infoBoxH, CONTENT_W, infoBoxH, C_BRAND_BG);
  // Borders
  page.drawRectangle({ x: M_LEFT, y: curY - infoBoxH, width: CONTENT_W, height: infoBoxH, borderColor: C_BORDER, borderWidth: 0.5 });
  page.drawLine({ start: { x: M_LEFT + col3, y: curY }, end: { x: M_LEFT + col3, y: curY - infoBoxH }, thickness: 0.5, color: C_BORDER });
  page.drawLine({ start: { x: M_LEFT + col3 * 2, y: curY }, end: { x: M_LEFT + col3 * 2, y: curY - infoBoxH }, thickness: 0.5, color: C_BORDER });

  // Labels
  const lSize = 7;
  const vSize = 10;
  page.drawText('Candidate', { x: M_LEFT + 8, y: curY - 13, size: lSize, font: fontBold, color: C_LIGHT });
  page.drawText(truncate(data.candidateName, fontBold, vSize, col3 - 20), { x: M_LEFT + 8, y: curY - 28, size: vSize, font: fontBold, color: C_DARK });

  page.drawText('Specialty', { x: M_LEFT + col3 + 8, y: curY - 13, size: lSize, font: fontBold, color: C_LIGHT });
  page.drawText(truncate(data.specialty || 'N/A', fontBold, vSize, col3 - 20), { x: M_LEFT + col3 + 8, y: curY - 28, size: vSize, font: fontBold, color: C_DARK });

  page.drawText('Date Completed', { x: M_LEFT + col3 * 2 + 8, y: curY - 13, size: lSize, font: fontBold, color: C_LIGHT });
  page.drawText(truncate(data.completedDate || 'N/A', fontBold, vSize, col3 - 20), { x: M_LEFT + col3 * 2 + 8, y: curY - 28, size: vSize, font: fontBold, color: C_DARK });

  curY -= infoBoxH + 16;

  // ── SKILLS TABLE ──
  const ROW_H = 18;
  const HEADER_H = 22;
  const CAT_H = 20;
  const fTable = 8.5;
  const fTableHead = 8.5;

  // Table header row
  ensureSpace(HEADER_H + ROW_H);
  drawRect(page, COL_SKILL, curY - HEADER_H, CONTENT_W, HEADER_H, C_BRAND);
  page.drawText('Skill',   { x: COL_SKILL + 6, y: curY - 15, size: fTableHead, font: fontBold, color: C_WHITE });
  page.drawText('Rating',  { x: COL_RATING + 6, y: curY - 15, size: fTableHead, font: fontBold, color: C_WHITE });
  page.drawText('N/A',     { x: COL_NA + 6, y: curY - 15, size: fTableHead, font: fontBold, color: C_WHITE });
  curY -= HEADER_H;

  for (const [category, skills] of categories) {
    // Category row
    ensureSpace(CAT_H + ROW_H);
    drawRect(page, COL_SKILL, curY - CAT_H, CONTENT_W, CAT_H, C_BRAND_BG);
    page.drawText(truncate(category, fontBold, fTable, CONTENT_W - 16), { x: COL_SKILL + 8, y: curY - 14, size: fTable, font: fontBold, color: C_BRAND });
    curY -= CAT_H;

    // Skill rows
    for (const skill of skills) {
      ensureSpace(ROW_H + 10);

      // Light bottom border
      drawHLine(page, COL_SKILL, curY - ROW_H, CONTENT_W, C_BORDER, 0.3);

      // Skill name (may need wrapping for long names)
      const skillLabel = skill.skillName;
      if (fontRegular.widthOfTextAtSize(skillLabel, fTable) <= COL_SKILL_W - 20) {
        page.drawText(truncate(skillLabel, fontRegular, fTable, COL_SKILL_W - 20), { x: COL_SKILL + 16, y: curY - 13, size: fTable, font: fontRegular, color: C_DARK });
      } else {
        // Wrap long skill names
        const lines = wrapText(skillLabel, fontRegular, fTable, COL_SKILL_W - 20);
        let ly = curY - 13;
        for (const line of lines.slice(0, 2)) {
          page.drawText(line, { x: COL_SKILL + 16, y: ly, size: fTable, font: fontRegular, color: C_DARK });
          ly -= fTable + 2;
        }
      }

      // Rating
      const ratingText = skill.isNa ? '\u2014' : (RATING_LABELS[skill.rating] || skill.rating);
      const ratingW = fontRegular.widthOfTextAtSize(ratingText, fTable);
      page.drawText(ratingText, { x: COL_RATING + (COL_RATING_W - ratingW) / 2, y: curY - 13, size: fTable, font: fontRegular, color: C_DARK });

      // N/A check
      if (skill.isNa) {
        const naW = fontRegular.widthOfTextAtSize('\u2713', fTable);
        page.drawText('\u2713', { x: COL_NA + (COL_NA_W - naW) / 2, y: curY - 13, size: fTable, font: fontRegular, color: C_DARK });
      }

      curY -= ROW_H;
    }
  }

  // Table bottom border
  drawHLine(page, COL_SKILL, curY, CONTENT_W, C_BRAND, 1);
  curY -= 20;

  // ── ATTESTATION ──
  ensureSpace(80);
  drawHLine(page, M_LEFT, curY, CONTENT_W, C_BRAND, 2);
  curY -= 18;
  page.drawText('ATTESTATION', { x: M_LEFT, y: curY, size: 12, font: fontBold, color: C_BRAND });
  curY -= 20;

  // Attestation box
  const attestLines = wrapText(data.attestationText, fontOblique, 8.5, CONTENT_W - 24);
  const attestBoxH = Math.max(40, attestLines.length * 13 + 20);
  ensureSpace(attestBoxH + 10);
  drawRect(page, M_LEFT, curY - attestBoxH, CONTENT_W, attestBoxH, rgb(1,1,1));
  page.drawRectangle({ x: M_LEFT, y: curY - attestBoxH, width: CONTENT_W, height: attestBoxH, borderColor: C_BORDER, borderWidth: 0.5 });
  let attestY = curY - 14;
  for (const line of attestLines) {
    page.drawText(line, { x: M_LEFT + 12, y: attestY, size: 8.5, font: fontOblique, color: C_MEDIUM });
    attestY -= 13;
  }
  curY -= attestBoxH + 24;

  // ── SIGNATURE ──
  ensureSpace(70);

  // Embed signature image if available
  if (data.signatureBase64) {
    try {
      const sigData = data.signatureBase64.startsWith('data:')
        ? data.signatureBase64.split(',')[1]
        : data.signatureBase64;
      const sigBytes = Buffer.from(sigData, 'base64');
      const sigImage = await pdfDoc.embedPng(sigBytes).catch(() => pdfDoc.embedJpg(sigBytes));
      const sigDims = sigImage.scale(0.4);
      ensureSpace(sigDims.height + 40);
      page.drawImage(sigImage, { x: M_LEFT, y: curY - sigDims.height, width: sigDims.width, height: sigDims.height });
      curY -= sigDims.height + 4;
    } catch {
      // If signature image fails, draw a line
      drawHLine(page, M_LEFT, curY - 30, 200, C_DARK, 1);
      curY -= 34;
    }
  } else {
    drawHLine(page, M_LEFT, curY - 30, 200, C_DARK, 1);
    curY -= 34;
  }

  page.drawText(`Signed by: ${data.signatureName}`, { x: M_LEFT, y: curY, size: 9, font: fontRegular, color: C_MEDIUM });
  curY -= 14;
  page.drawText(`Valid until: ${data.validUntil || 'N/A'}`, { x: M_LEFT, y: curY, size: 8, font: fontRegular, color: C_LIGHT });

  // Date and agency on right
  const dateText = `Date: ${data.signatureDate}`;
  const dateW = fontRegular.widthOfTextAtSize(dateText, 9);
  page.drawText(dateText, { x: PAGE_W - M_RIGHT - dateW, y: curY + 14, size: 9, font: fontRegular, color: C_MEDIUM });
  if (data.agencyName) {
    const agencyText = `Agency: ${data.agencyName}`;
    const agencyW = fontRegular.widthOfTextAtSize(agencyText, 8);
    page.drawText(agencyText, { x: PAGE_W - M_RIGHT - agencyW, y: curY, size: 8, font: fontRegular, color: C_LIGHT });
  }

  // Finalize — add footer to last page
  footer(page, pageNum);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/** Truncate text with ellipsis if wider than maxWidth */
function truncate(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + '...', fontSize) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
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
