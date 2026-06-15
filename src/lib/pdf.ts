// pdfmake 0.3.x server-side usage requires three components:
//   1. PdfPrinter from 'pdfmake/js/Printer' (NOT from 'pdfmake' — that only exports virtualfs etc.)
//   2. A virtual-fs instance (from pdfmake.virtualfs) with font files written as decoded Buffers
//   3. A URLResolver from 'pdfmake/js/URLResolver' for resolving font/image URLs
//
// The vfs_fonts module stores fonts as base64 strings — they MUST be decoded to Buffers
// before writing to virtualfs, otherwise fontkit throws "Unknown font format".
let printerInstance: any = null;

async function getPrinter(): Promise<any> {
  if (printerInstance) return printerInstance;

  // 1. Import PdfPrinter from the correct subpath
  let PdfPrinter: any;
  try {
    const printerModule = await import('pdfmake/js/Printer');
    PdfPrinter = printerModule.default || printerModule;
  } catch {
    const printerModule = await import('pdfmake/src/Printer');
    PdfPrinter = printerModule.default || printerModule;
  }

  // 2. Import URLResolver
  let URLResolver: any;
  try {
    const urlModule = await import('pdfmake/js/URLResolver');
    URLResolver = urlModule.default || urlModule;
  } catch {
    const urlModule = await import('pdfmake/src/URLResolver');
    URLResolver = urlModule.default || urlModule;
  }

  // 3. Get the virtual-fs instance from the pdfmake module
  const pdfmakeModule = await import('pdfmake');
  const pdfmake: any = pdfmakeModule.default || pdfmakeModule;
  const fs = pdfmake.virtualfs;

  // 4. Load base64 font data and write decoded Buffers into virtualfs
  const vfsModule = await import('pdfmake/build/vfs_fonts');
  const vfsData: any = vfsModule.default?.pdfMake?.vfs
    || vfsModule.pdfMake?.vfs
    || vfsModule.default
    || vfsModule;
  for (const [name, b64] of Object.entries(vfsData)) {
    if (typeof b64 === 'string' && name.endsWith('.ttf')) {
      fs.writeFileSync(name, Buffer.from(b64, 'base64'));
    }
  }

  const fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  // 5. Create printer with all required dependencies
  const urlResolver = new URLResolver(fs);
  const printer = new PdfPrinter(fonts, fs, urlResolver);
  printerInstance = printer;
  return printerInstance;
}

const BRAND_COLOR = '#059669';
const BRAND_LIGHT = '#F0FDFA';
const TEXT_DARK = '#0F172A';
const TEXT_MEDIUM = '#475569';
const TEXT_LIGHT = '#94A3B8';
const BORDER_COLOR = '#E2E8F0';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function createHeader(title: string): any[] {
  return [
    // Gradient bar (emerald → teal → cyan)
    {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 200, h: 52, color: BRAND_COLOR },
        { type: 'rect', x: 200, y: 0, w: 200, h: 52, color: '#0D9488' },
        { type: 'rect', x: 400, y: 0, w: 197, h: 52, color: '#06B6D4' },
      ],
      margin: [-48, 0, -48, 0],
    },
    {
      text: title,
      style: 'headerTitle',
      absolutePosition: { x: 48, y: 15 },
    },
    { text: '', margin: [0, 10] },
  ];
}

function createBrandLine(): any {
  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 200, h: 2, color: BRAND_COLOR },
      { type: 'rect', x: 200, y: 0, w: 200, h: 2, color: '#0D9488' },
      { type: 'rect', x: 400, y: 0, w: 197, h: 2, color: '#06B6D4' },
    ],
    margin: [-48, 0, -48, 15],
  };
}

// Premium info card — glass-style rounded box
function infoCard(label: string, value: string, opts?: { valueColor?: string }): any {
  return {
    table: { widths: ['*'], body: [[{
      stack: [
        { text: label, fontSize: 8, color: TEXT_LIGHT, bold: true, characterSpacing: 0.8 },
        { text: value, fontSize: 13, bold: true, color: opts?.valueColor || TEXT_DARK, margin: [0, 4, 0, 0] },
      ],
      fillColor: '#F8FAFC', border: [false, false, false, false], margin: [14, 12, 14, 12],
    }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0' },
  };
}

// Premium verification box
function verificationBox(docId: string, verCode: string): any {
  return {
    table: { widths: ['*'], body: [[{
      stack: [
        {
          columns: [
            { width: 24, text: 'V', fontSize: 14, bold: true, color: BRAND_COLOR, margin: [0, 2, 0, 0] },
            {
              width: '*',
              stack: [
                { text: 'DOCUMENT VERIFIED', fontSize: 12, bold: true, color: BRAND_COLOR },
                { text: 'This document has been electronically signed and verified through MyZipVault\'s secure credential verification system.', fontSize: 10, color: TEXT_MEDIUM, lineHeight: 1.5, margin: [0, 4, 0, 0] },
              ],
            },
          ],
        },
        { text: '', margin: [0, 10, 0, 0] },
        {
          columns: [
            { text: `Document ID: ${docId}`, fontSize: 9, color: TEXT_MEDIUM, width: '50%' },
            { text: `Verification Code: ${verCode}`, fontSize: 9, color: TEXT_MEDIUM, width: '50%' },
          ],
        },
        {
          text: `Verify at: myzipvault.com/verify-document`,
          fontSize: 8, color: BRAND_COLOR, margin: [0, 6, 0, 0],
        },
      ],
      fillColor: '#F0FDFA', border: [false, false, false, false], margin: [20, 16, 20, 16],
    }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#6EE7B7', vLineColor: () => '#6EE7B7' },
  };
}

async function pdfDocToBuffer(docDefinition: any): Promise<Buffer> {
  const printer = await getPrinter();
  // pdfmake 0.3.x: createPdfKitDocument is async
  const doc = await printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
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
  const docId = `MZV-BAA-${Date.now().toString(36).toUpperCase()}`;
  const verInput = `${data.organizationName}-${data.signerName}-${data.signedAt.toISOString()}`;
  const verCode = verInput.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(16).toUpperCase().replace(/-/g, '0').padStart(8, '0').slice(0, 8);

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [48, 40, 48, 40],
    defaultStyle: { font: 'Roboto' },
    styles: {
      ...baseStyles,
      headerTitle: { fontSize: 22, bold: true, color: '#ffffff' },
    },
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: 'BUSINESS ASSOCIATE AGREEMENT', fontSize: 9, bold: true, color: BRAND_COLOR, characterSpacing: 0.5, margin: [48, 12, 0, 0] },
          { text: data.organizationName, fontSize: 9, color: TEXT_MEDIUM, alignment: 'right', margin: [0, 12, 48, 0] },
        ],
        canvas: [{ type: 'line', x1: -48, y1: 26, x2: 599, y2: 26, lineWidth: 0.5, lineColor: BORDER_COLOR }],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Business Associate Agreement', style: 'footer', margin: [48, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', margin: [0, 0, 48, 0], alignment: 'right' },
        ],
        canvas: [{ type: 'line', x1: -48, y1: -6, x2: 599, y2: -6, lineWidth: 0.5, lineColor: BORDER_COLOR }],
        margin: [0, 8, 0, 0],
      };
    },
    content: [
      // Premium gradient header
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 52, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 52, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 52, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },
      {
        text: 'BUSINESS ASSOCIATE AGREEMENT',
        fontSize: 22, bold: true, color: '#ffffff',
        absolutePosition: { x: 48, y: 15 },
      },
      { text: '', margin: [0, 16] },

      // Parties section — premium info cards
      {
        columns: [
          { width: '50%', stack: [infoCard('THIS AGREEMENT ENTERED INTO BY', data.organizationName)] },
          { width: '4%', text: '' },
          { width: '46%', stack: [infoCard('DATE EXECUTED', formatDate(data.signedAt), { valueColor: BRAND_COLOR })] },
        ],
        margin: [0, 0, 0, 24],
      },

      // BAA Content
      { text: data.baaContent, style: 'bodyText', margin: [0, 0, 0, 30] },

      // Signature block
      createBrandLine(),
      { text: 'SIGNATURE & CERTIFICATION', fontSize: 14, bold: true, color: TEXT_DARK, margin: [0, 0, 0, 16] },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'SIGNED BY', fontSize: 8, color: TEXT_LIGHT, bold: true, characterSpacing: 0.8 },
                  { text: data.signerName, bold: true, fontSize: 14, color: TEXT_DARK, margin: [0, 4, 0, 0] },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 16],
              },
              {
                stack: [
                  { text: 'TITLE', fontSize: 8, color: TEXT_LIGHT, bold: true, characterSpacing: 0.8 },
                  { text: data.signerTitle, bold: true, fontSize: 14, color: TEXT_DARK, margin: [0, 4, 0, 0] },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 16],
              },
            ],
            [
              {
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 0, 0, 4] },
                  { text: 'Signature', fontSize: 8, color: TEXT_LIGHT, characterSpacing: 0.8 },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 12],
              },
              {
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 0, 0, 4] },
                  { text: 'Date', fontSize: 8, color: TEXT_LIGHT, characterSpacing: 0.8 },
                ],
                border: [false, false, false, false],
                margin: [0, 0, 0, 12],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 24],
      },

      // Verification box
      verificationBox(docId, verCode),

      // Bottom branding
      { text: '', margin: [0, 20, 0, 0] },
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 3, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 3, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 3, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },
      { text: '', margin: [0, 8, 0, 0] },
      {
        stack: [
          { text: 'Generated by MyZipVault', fontSize: 9, color: TEXT_LIGHT, alignment: 'center' },
          { text: 'Secure Healthcare Credential Verification Platform', fontSize: 8, color: '#C4C4C4', alignment: 'center', margin: [0, 2, 0, 0] },
        ],
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
  const docId = `MZV-INV-${Date.now().toString(36).toUpperCase()}`;

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [48, 40, 48, 40],
    defaultStyle: { font: 'Roboto' },
    styles: {
      ...baseStyles,
      headerTitle: { fontSize: 22, bold: true, color: '#ffffff' },
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Invoice', style: 'footer', margin: [48, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', margin: [0, 0, 48, 0], alignment: 'right' },
        ],
        canvas: [{ type: 'line', x1: -48, y1: -6, x2: 599, y2: -6, lineWidth: 0.5, lineColor: BORDER_COLOR }],
        margin: [0, 8, 0, 0],
      };
    },
    content: [
      // Premium gradient header bar
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 8, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 8, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 8, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },

      // Header with branding
      {
        columns: [
          {
            stack: [
              {
                table: { widths: ['auto'], body: [[{
                  text: 'MyZipVault',
                  fontSize: 24, bold: true, color: '#FFFFFF',
                  fillColor: BRAND_COLOR, margin: [12, 6, 12, 6], border: [false, false, false, false],
                }]] },
                layout: 'noBorders',
              },
              { text: 'Healthcare Credentialing Solutions', fontSize: 10, color: TEXT_MEDIUM, margin: [0, 6, 0, 0] },
            ],
            width: '*',
          },
          {
            stack: [
              { text: 'INVOICE', fontSize: 28, bold: true, color: BRAND_COLOR, alignment: 'right' },
              { text: docId, fontSize: 9, color: TEXT_LIGHT, alignment: 'right', margin: [0, 2, 0, 0] },
            ],
            width: 'auto',
          },
        ],
        margin: [0, 24, 0, 8],
      },
      createBrandLine(),

      // Invoice details — premium info cards
      {
        columns: [
          { width: '50%', stack: [infoCard('BILL TO', data.agencyName)] },
          { width: '4%', text: '' },
          {
            width: '46%',
            stack: [
              infoCard('INVOICE #', data.invoiceNumber),
              { text: '', margin: [0, 8, 0, 0] },
              infoCard('DATE', formatDate(data.date), { valueColor: BRAND_COLOR }),
            ],
          },
        ],
        margin: [0, 0, 0, 24],
      },

      // Line items table — premium
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            // Header row — gradient
            [
              { text: 'Description', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 10, margin: [12, 10, 12, 10] },
              { text: 'Qty', fillColor: '#0D9488', color: '#ffffff', bold: true, fontSize: 10, alignment: 'center', margin: [12, 10, 12, 10] },
              { text: 'Unit Price', fillColor: '#0D9488', color: '#ffffff', bold: true, fontSize: 10, alignment: 'right', margin: [12, 10, 12, 10] },
              { text: 'Amount', fillColor: '#06B6D4', color: '#ffffff', bold: true, fontSize: 10, alignment: 'right', margin: [12, 10, 12, 10] },
            ],
            // Data row
            [
              { text: 'Credential Verification Credits', fontSize: 11, color: TEXT_DARK, margin: [12, 12, 12, 12] },
              { text: data.creditAmount.toString(), fontSize: 11, color: TEXT_DARK, alignment: 'center', margin: [12, 12, 12, 12] },
              { text: `$${data.pricePerCredit.toFixed(2)}`, fontSize: 11, color: TEXT_DARK, alignment: 'right', margin: [12, 12, 12, 12] },
              { text: `$${(data.creditAmount * data.pricePerCredit).toFixed(2)}`, fontSize: 11, color: TEXT_DARK, alignment: 'right', margin: [12, 12, 12, 12] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.3,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1) ? BRAND_COLOR : '#F3F4F6',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 0],
      },

      // Totals — premium
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: '', border: [false, false, false, false] },
              { text: '', border: [false, false, false, false] },
            ],
            [
              { text: 'Subtotal:', fontSize: 10, color: TEXT_MEDIUM, alignment: 'right', margin: [0, 4, 12, 4], border: [false, false, false, false] },
              { text: `$${(data.creditAmount * data.pricePerCredit).toFixed(2)}`, fontSize: 10, color: TEXT_DARK, alignment: 'right', margin: [0, 4, 0, 4], border: [false, false, false, false] },
            ],
            [
              {
                text: 'Total Due:',
                fontSize: 14, bold: true, color: '#FFFFFF', alignment: 'right', margin: [0, 6, 12, 6],
                border: [false, false, false, false],
              },
              {
                text: `$${data.totalPrice.toFixed(2)}`,
                fontSize: 14, bold: true, color: '#FFFFFF', alignment: 'right', margin: [0, 6, 0, 6],
                border: [false, false, false, false],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 8, 0, 0],
        // Override last row background with gradient table
        fillColor: (row: number) => row === 2 ? BRAND_COLOR : undefined,
      },

      { text: '', margin: [0, 24, 0, 0] },
      createBrandLine(),

      // Payment terms — premium card
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'PAYMENT TERMS', fontSize: 9, bold: true, color: BRAND_COLOR, characterSpacing: 0.8, margin: [0, 0, 0, 8] },
            { text: 'Payment is due upon receipt of this invoice. Please include the invoice number with your payment.', fontSize: 10, color: TEXT_MEDIUM, lineHeight: 1.5 },
            { text: '', margin: [0, 8, 0, 0] },
            { text: 'Thank you for your business!', fontSize: 10, color: BRAND_COLOR, bold: true, italics: true },
          ],
          fillColor: '#F8FAFC', border: [false, false, false, false], margin: [20, 16, 20, 16],
        }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => BORDER_COLOR, vLineColor: () => BORDER_COLOR },
        margin: [0, 0, 0, 24],
      },

      // Bottom branding
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 3, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 3, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 3, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },
      { text: '', margin: [0, 8, 0, 0] },
      {
        stack: [
          { text: 'Generated by MyZipVault', fontSize: 9, color: TEXT_LIGHT, alignment: 'center' },
          { text: 'Secure Healthcare Credential Verification Platform', fontSize: 8, color: '#C4C4C4', alignment: 'center', margin: [0, 2, 0, 0] },
        ],
      },
    ],
  };

  return pdfDocToBuffer(docDefinition);
}

// ─────────────────────────────────────────────────────────────
// 3. Checklist PDF — Premium Enterprise Design (pdfmake)
// ─────────────────────────────────────────────────────────────

const CL_GREEN = '#059669';
const CL_TEAL  = '#0D9488';
const CL_CYAN  = '#06B6D4';
const CL_GREEN_LIGHT = '#D1FAE5';
const CL_TEAL_LIGHT  = '#CCFBF1';
const CL_CYAN_LIGHT  = '#CFFAFE';
const CL_WARN  = '#CA8A04';
const CL_WARN_LIGHT  = '#FEF9C3';
const CL_ERR   = '#DC2626';
const CL_ERR_LIGHT   = '#FEE2E2';
const CL_TEXT  = '#0F172A';
const CL_GRAY1 = '#475569';
const CL_GRAY2 = '#64748B';
const CL_GRAY3 = '#94A3B8';
const CL_BORDER = '#E2E8F0';
const CL_SURF  = '#F8FAFC';
const CL_SURF2 = '#F1F5F9';
const CL_GREEN_SURF = '#F0FDFA';
const CL_GREEN_BORDER = '#6EE7B7';

const RATING_CFG: Record<string, { label: string; color: string; bg: string }> = {
  '4': { label: 'Proficient',      color: CL_GREEN, bg: CL_GREEN_LIGHT },
  '3': { label: 'Experienced',     color: CL_TEAL,  bg: CL_TEAL_LIGHT },
  '2': { label: 'Limited Exp.',    color: CL_WARN,  bg: CL_WARN_LIGHT },
  '1': { label: 'No Experience',   color: CL_ERR,   bg: CL_ERR_LIGHT },
};

function clBadge(rating: string, isNa: boolean): any {
  if (isNa) {
    return {
      table: { widths: ['auto'], body: [[{
        text: 'N/A', fontSize: 9, bold: true, color: CL_GRAY3,
        fillColor: CL_SURF2, margin: [8, 2, 8, 2], border: [false, false, false, false], alignment: 'center',
      }]] },
      layout: 'noBorders', alignment: 'right',
    };
  }
  const c = RATING_CFG[rating] || { label: rating, color: CL_GRAY2, bg: CL_SURF2 };
  return {
    table: { widths: ['auto'], body: [[{
      text: c.label, fontSize: 9, bold: true, color: c.color,
      fillColor: c.bg, margin: [8, 2, 8, 2], border: [false, false, false, false], alignment: 'center',
    }]] },
    layout: 'noBorders', alignment: 'right',
  };
}

function distBar(label: string, count: number, total: number, color: string, maxW: number): any {
  const pct = total > 0 ? count / total : 0;
  const filledW = Math.max(pct > 0 ? 4 : 0, maxW * pct);
  return {
    columns: [
      { text: label, width: 58, fontSize: 8, color: CL_GRAY1, margin: [0, 1, 0, 0] },
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: maxW, h: 8, color: CL_SURF2 },
          { type: 'rect', x: 0, y: 0, w: filledW, h: 8, color },
        ],
        width: maxW + 4,
        margin: [0, 1, 0, 0],
      },
      { text: `${count}`, width: 18, fontSize: 8, bold: true, color, alignment: 'right', margin: [0, 1, 0, 0] },
    ],
    margin: [0, 2, 0, 2],
  };
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

  // ── Stats ──
  const rated = data.skills.filter(s => !s.isNa);
  const totalRated = rated.length;
  const totalNa = data.skills.filter(s => s.isNa).length;
  const cnt: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };
  let sum = 0;
  for (const s of rated) { if (cnt[s.rating] !== undefined) cnt[s.rating]++; sum += parseInt(s.rating) || 0; }
  const overallScore = totalRated > 0 ? Math.round(sum / (totalRated * 4) * 100) : 0;
  const profPct = totalRated > 0 ? Math.round(cnt['4'] / totalRated * 100) : 0;

  // Group by category
  const catMap = new Map<string, typeof data.skills>();
  for (const s of data.skills) {
    const list = catMap.get(s.category) || [];
    list.push(s);
    catMap.set(s.category, list);
  }

  // Verification code
  const verInput = `${data.candidateName}-${data.checklistName}-${data.signatureDate}`;
  const verCode = verInput.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(16).toUpperCase().replace(/-/g, '0').padStart(8, '0').slice(0, 8);
  const docId = `MZV-${Date.now().toString(36).toUpperCase()}`;

  const content: any[] = [];

  // ══════════════════════════════════════════════════════════════
  // PAGE 1 — COVER PAGE
  // ══════════════════════════════════════════════════════════════

  // Top gradient bar (simulated with three rectangles — emerald → teal → cyan)
  content.push({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 200, h: 8, color: CL_GREEN },
      { type: 'rect', x: 200, y: 0, w: 200, h: 8, color: CL_TEAL },
      { type: 'rect', x: 400, y: 0, w: 197, h: 8, color: CL_CYAN },
    ],
    margin: [-48, -40, -48, 0],
  });

  // Top section: Agency + Document type
  content.push({
    columns: [
      {
        width: '60%',
        stack: [
          // Agency name styled box
          {
            table: { widths: ['auto'], body: [[{
              text: data.agencyName || 'MyZipVault',
              fontSize: 16, bold: true, color: '#FFFFFF',
              fillColor: CL_GREEN, margin: [12, 8, 12, 8], border: [false, false, false, false],
            }]] },
            layout: 'noBorders',
            margin: [0, 28, 0, 0],
          },
          {
            text: (data.agencyName || 'MyZipVault').toUpperCase(),
            fontSize: 11, color: CL_GRAY2, characterSpacing: 0.5,
            margin: [0, 10, 0, 0],
          },
        ],
      },
      {
        width: '40%',
        stack: [
          {
            text: 'SKILLS CHECKLIST',
            fontSize: 10, bold: true, color: CL_TEAL, characterSpacing: 1.2,
            alignment: 'right', margin: [0, 36, 0, 0],
          },
          {
            text: docId,
            fontSize: 9, color: CL_GRAY3, alignment: 'right',
            margin: [0, 4, 0, 0],
          },
        ],
      },
    ],
    margin: [0, 0, 0, 16],
  });

  // Divider line
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1, lineColor: CL_BORDER }],
    margin: [0, 0, 0, 0],
  });

  // Middle section: Title + Candidate
  content.push({
    stack: [
      {
        text: data.checklistName || 'Skill Checklist',
        fontSize: 34, bold: true, color: CL_TEXT, characterSpacing: -0.5, lineHeight: 1.2,
        margin: [0, 32, 0, 0],
      },
      {
        text: 'Skill Checklist',
        fontSize: 18, color: CL_GRAY2, margin: [0, 4, 0, 0],
      },
      { text: '', margin: [0, 24, 0, 0] },
      {
        text: data.candidateName,
        fontSize: 15, bold: true, color: CL_TEXT,
      },
      { text: '', margin: [0, 8, 0, 0] },
      {
        table: { widths: ['auto'], body: [[{
          text: (data.specialty || 'N/A').toUpperCase(),
          fontSize: 10, bold: true, color: CL_GREEN,
          fillColor: CL_GREEN_LIGHT, margin: [10, 3, 10, 3], border: [false, false, false, false],
        }]] },
        layout: 'noBorders',
      },
    ],
    margin: [0, 0, 0, 24],
  });

  // Score section: 3 columns
  const distMaxW = 110;
  content.push({
    columns: [
      {
        width: '28%',
        stack: [
          { text: `${overallScore}%`, fontSize: 48, bold: true, color: CL_GREEN, lineHeight: 1 },
          { text: 'OVERALL SCORE', fontSize: 8, color: CL_GRAY3, characterSpacing: 1, margin: [0, 2, 0, 0] },
        ],
      },
      {
        width: '28%',
        stack: [
          { text: `${profPct}%`, fontSize: 48, bold: true, color: CL_TEAL, lineHeight: 1 },
          { text: 'PROFICIENCY RATE', fontSize: 8, color: CL_GRAY3, characterSpacing: 1, margin: [0, 2, 0, 0] },
          { text: `${cnt['4']} of ${totalRated} skills rated`, fontSize: 9, color: CL_GRAY2, margin: [0, 4, 0, 0] },
        ],
      },
      {
        width: '44%',
        stack: [
          { text: 'SKILL DISTRIBUTION', fontSize: 7, bold: true, color: CL_GRAY3, characterSpacing: 0.8, margin: [0, 0, 0, 4] },
          distBar('Proficient', cnt['4'], totalRated, CL_GREEN, distMaxW),
          distBar('Experienced', cnt['3'], totalRated, CL_TEAL, distMaxW),
          distBar('Limited', cnt['2'], totalRated, CL_WARN, distMaxW),
          distBar('No Exp.', cnt['1'], totalRated, CL_ERR, distMaxW),
          ...(totalNa > 0 ? [{ text: `${totalNa} skill${totalNa > 1 ? 's' : ''} marked N/A`, fontSize: 7, color: CL_GRAY3, italics: true, margin: [0, 4, 0, 0] }] : []),
        ],
      },
    ],
    margin: [0, 0, 0, 24],
  });

  // Bottom info boxes
  content.push({
    columns: [
      {
        width: '33%',
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'COMPLETED', fontSize: 8, color: CL_GRAY3, characterSpacing: 1 },
            { text: data.completedDate || 'N/A', fontSize: 13, bold: true, color: CL_TEXT, margin: [0, 4, 0, 0] },
          ],
          fillColor: CL_SURF, border: [false, false, false, false], margin: [14, 12, 14, 12],
        }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_BORDER, vLineColor: () => CL_BORDER },
      },
      {
        width: '5%',
        text: '',
      },
      {
        width: '33%',
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'VALID UNTIL', fontSize: 8, color: CL_GRAY3, characterSpacing: 1 },
            { text: data.validUntil || 'N/A', fontSize: 13, bold: true, color: CL_TEXT, margin: [0, 4, 0, 0] },
          ],
          fillColor: CL_SURF, border: [false, false, false, false], margin: [14, 12, 14, 12],
        }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_BORDER, vLineColor: () => CL_BORDER },
      },
      {
        width: '5%',
        text: '',
      },
      {
        width: '33%',
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'DOCUMENT STATUS', fontSize: 8, color: CL_GRAY3, characterSpacing: 1 },
            { text: 'Verified', fontSize: 13, bold: true, color: CL_GREEN, margin: [0, 4, 0, 0] },
          ],
          fillColor: CL_SURF, border: [false, false, false, false], margin: [14, 12, 14, 12],
        }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_BORDER, vLineColor: () => CL_BORDER },
      },
    ],
    margin: [0, 0, 0, 16],
  });

  // Bottom gradient bar (3-color)
  content.push({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 200, h: 4, color: CL_GREEN },
      { type: 'rect', x: 200, y: 0, w: 200, h: 4, color: CL_TEAL },
      { type: 'rect', x: 400, y: 0, w: 197, h: 4, color: CL_CYAN },
    ],
    margin: [-48, 16, -48, 0],
  });

  // Page break after cover
  content.push({ text: '', pageBreak: 'after' });

  // ══════════════════════════════════════════════════════════════
  // PAGE 2+ — SKILL PAGES
  // ══════════════════════════════════════════════════════════════
  for (const [cat, skills] of catMap) {
    // Category header
    content.push({
      columns: [
        {
          width: '*',
          table: { widths: ['*'], body: [[{
            text: cat.toUpperCase(),
            fontSize: 12, bold: true, color: CL_GREEN, characterSpacing: 0.5,
            fillColor: CL_GREEN_SURF, margin: [12, 6, 12, 6], border: [false, false, false, false],
          }]] },
          layout: 'noBorders',
        },
        {
          width: 'auto',
          table: { widths: ['auto'], body: [[{
            text: `${skills.length}`,
            fontSize: 9, bold: true, color: '#FFFFFF',
            fillColor: CL_GREEN, margin: [8, 3, 8, 3], border: [false, false, false, false], alignment: 'center',
          }]] },
          layout: 'noBorders',
          margin: [0, 4, 0, 0],
        },
      ],
      // Left green accent bar
      background: (row: any, col: any, x: number, y2: number, w: number, h: number, out: any[]) => {
        out.push({ type: 'rect', x: x - 48, y: y2, w: 4, h, color: CL_GREEN });
      },
      margin: [0, 0, 0, 0],
    });

    // Skills table for this category
    const skillRows: any[] = [];
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const bg = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
      skillRows.push([
        {
          text: skill.skillName,
          fontSize: 11, color: CL_TEXT, lineHeight: 1.3,
          margin: [0, 0, 0, 0], border: [false, false, false, false],
          fillColor: bg,
        },
        {
          stack: [clBadge(skill.rating, skill.isNa)],
          margin: [0, 0, 0, 0], border: [false, false, false, false],
          fillColor: bg,
        },
      ]);
    }

    content.push({
      table: {
        widths: ['55%', '45%'],
        body: skillRows,
      },
      layout: {
        hLineWidth: (i: number, node: any) => i < node.table.body.length ? 0.3 : 0,
        hLineColor: () => '#F3F4F6',
        vLineWidth: () => 0,
        paddingLeft: () => 14,
        paddingRight: () => 14,
        paddingTop: () => 7,
        paddingBottom: () => 7,
      },
      margin: [0, 0, 0, 16],
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ATTESTATION SECTION
  // ══════════════════════════════════════════════════════════════
  content.push({
    table: { widths: ['*'], body: [[{
      stack: [
        { text: 'ATTESTATION', fontSize: 9, bold: true, color: CL_GRAY2, characterSpacing: 1, margin: [0, 0, 0, 10] },
        { text: data.attestationText, fontSize: 10.5, color: CL_GRAY1, lineHeight: 1.7, italics: true },
      ],
      fillColor: CL_SURF, border: [false, false, false, false], margin: [24, 20, 24, 20],
    }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_BORDER, vLineColor: () => CL_BORDER },
    margin: [0, 16, 0, 24],
  });

  // ══════════════════════════════════════════════════════════════
  // SIGNATURE PAGE
  // ══════════════════════════════════════════════════════════════
  content.push({ text: '', pageBreak: 'before' });

  // Section heading
  content.push({
    stack: [
      { text: 'SIGNATURE & CERTIFICATION', fontSize: 20, bold: true, color: CL_TEXT },
      { text: 'Electronically signed via MyZipVault', fontSize: 11, color: CL_GRAY2, margin: [0, 4, 0, 0] },
    ],
    margin: [0, 8, 0, 12],
  });

  // Divider
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1, lineColor: CL_BORDER }],
    margin: [0, 0, 0, 20],
  });

  // Signature display box
  const sigStack: any[] = [];
  if (data.signatureBase64) {
    try {
      const sigSrc = data.signatureBase64.startsWith('data:') ? data.signatureBase64 : `data:image/png;base64,${data.signatureBase64}`;
      sigStack.push({ image: sigSrc, width: 200, height: 60, margin: [0, 0, 0, 8] });
    } catch {
      sigStack.push({ text: '', margin: [0, 30, 0, 0] });
    }
  } else {
    sigStack.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 1, lineColor: CL_GRAY1 }],
      margin: [0, 30, 0, 8],
    });
  }
  sigStack.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 0.5, lineColor: CL_GRAY1 }],
    margin: [0, 0, 0, 4],
  });
  sigStack.push({
    text: 'CANDIDATE SIGNATURE',
    fontSize: 9, color: CL_GRAY3, characterSpacing: 0.8,
  });

  content.push({
    table: { widths: ['*'], body: [[{
      stack: sigStack,
      border: [false, false, false, false], margin: [32, 24, 32, 24],
    }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_BORDER, vLineColor: () => CL_BORDER },
    margin: [0, 0, 0, 20],
  });

  // Signatory details — 2-column grid
  content.push({
    columns: [
      {
        width: '50%',
        stack: [
          { text: 'SIGNED BY', fontSize: 9, color: CL_GRAY3, characterSpacing: 0.8 },
          { text: data.signatureName, fontSize: 14, bold: true, color: CL_TEXT, margin: [0, 4, 0, 0] },
          { text: '', margin: [0, 12, 0, 0] },
          { text: 'AGENCY', fontSize: 9, color: CL_GRAY3, characterSpacing: 0.8 },
          { text: data.agencyName || 'N/A', fontSize: 12, color: CL_GRAY1, margin: [0, 4, 0, 0] },
        ],
      },
      {
        width: '50%',
        stack: [
          { text: 'DATE SIGNED', fontSize: 9, color: CL_GRAY3, characterSpacing: 0.8 },
          { text: data.signatureDate, fontSize: 14, bold: true, color: CL_TEXT, margin: [0, 4, 0, 0] },
          { text: '', margin: [0, 12, 0, 0] },
          { text: 'VALID UNTIL', fontSize: 9, color: CL_GRAY3, characterSpacing: 0.8 },
          { text: data.validUntil || 'N/A', fontSize: 12, bold: true, color: CL_GREEN, margin: [0, 4, 0, 0] },
        ],
      },
    ],
    margin: [0, 0, 0, 20],
  });

  // Verification box
  content.push({
    table: { widths: ['*'], body: [[{
      stack: [
        {
          columns: [
            {
              width: 24,
              text: 'V',
              fontSize: 14, bold: true, color: CL_GREEN,
              margin: [0, 2, 0, 0],
            },
            {
              width: '*',
              stack: [
                { text: 'DOCUMENT VERIFIED', fontSize: 12, bold: true, color: CL_GREEN },
                { text: 'This document has been electronically signed and verified through MyZipVault\'s secure credential verification system.', fontSize: 10, color: CL_GRAY1, lineHeight: 1.5, margin: [0, 4, 0, 0] },
              ],
            },
          ],
        },
        { text: '', margin: [0, 10, 0, 0] },
        {
          columns: [
            { text: `Document ID: ${docId}`, fontSize: 9, color: CL_GRAY2, width: '50%' },
            { text: `Verification Code: ${verCode}`, fontSize: 9, color: CL_GRAY2, width: '50%' },
          ],
        },
        {
          text: `Verify at: myzipvault.com/verify-document`,
          fontSize: 8, color: CL_GREEN, margin: [0, 6, 0, 0],
        },
      ],
      fillColor: CL_GREEN_SURF, border: [false, false, false, false], margin: [20, 16, 20, 16],
    }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_GREEN_BORDER, vLineColor: () => CL_GREEN_BORDER },
    margin: [0, 0, 0, 16],
  });

  // Agency information box
  content.push({
    table: { widths: ['*'], body: [[{
      stack: [
        { text: 'REQUESTING AGENCY', fontSize: 9, color: CL_GRAY3, characterSpacing: 0.8 },
        { text: data.agencyName || 'MyZipVault', fontSize: 13, bold: true, color: CL_TEXT, margin: [0, 4, 0, 0] },
        { text: 'Secure Healthcare Credential Verification Platform', fontSize: 10, color: CL_GRAY2, lineHeight: 1.5, margin: [0, 4, 0, 0] },
      ],
      fillColor: CL_SURF, border: [false, false, false, false], margin: [20, 16, 20, 16],
    }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => CL_BORDER, vLineColor: () => CL_BORDER },
    margin: [0, 0, 0, 16],
  });

  // Bottom branding
  content.push({ text: '', margin: [0, 32, 0, 0] });
  content.push({
    stack: [
      { text: 'Generated by MyZipVault', fontSize: 9, color: CL_GRAY3, alignment: 'center' },
      { text: 'Secure Healthcare Credential Verification Platform', fontSize: 8, color: '#C4C4C4', alignment: 'center', margin: [0, 2, 0, 0] },
      { text: 'www.myzipvault.com', fontSize: 8, color: CL_GRAY3, alignment: 'center', margin: [0, 2, 0, 0] },
    ],
  });

  // ══════════════════════════════════════════════════════════════
  // DOCUMENT DEFINITION
  // ══════════════════════════════════════════════════════════════
  const docDefinition: any = {
    pageSize: { width: 595.28, height: 841.89 },
    pageMargins: [48, 40, 48, 40],
    defaultStyle: { font: 'Roboto' },
    content,
    styles: {
      coverTitle: { fontSize: 36, bold: true, color: CL_TEXT, characterSpacing: -0.5 },
      coverSubtitle: { fontSize: 20, color: CL_GRAY2 },
      coverScore: { fontSize: 56, bold: true, color: CL_GREEN, lineHeight: 1 },
      coverScoreTeal: { fontSize: 56, bold: true, color: CL_TEAL, lineHeight: 1 },
      coverLabel: { fontSize: 9, color: CL_GRAY3, characterSpacing: 1 },
      sectionHeader: { fontSize: 13, bold: true, color: CL_GREEN, characterSpacing: 0.5 },
      skillName: { fontSize: 12, color: CL_TEXT },
      proficientBadge: { fontSize: 10, bold: true, color: CL_GREEN },
      experiencedBadge: { fontSize: 10, bold: true, color: CL_TEAL },
      limitedBadge: { fontSize: 10, bold: true, color: CL_WARN },
      noExpBadge: { fontSize: 10, bold: true, color: CL_ERR },
      pageHeader: { fontSize: 10, bold: true, color: CL_GRAY1, characterSpacing: 0.5 },
      pageFooter: { fontSize: 9, color: CL_GRAY3 },
      attestationText: { fontSize: 11, color: CL_GRAY1, lineHeight: 1.7 },
      signatureLabel: { fontSize: 10, color: CL_GRAY3, characterSpacing: 0.8 },
      signedByName: { fontSize: 15, bold: true, color: CL_TEXT },
      verificationText: { fontSize: 11, color: CL_GRAY1 },
    },
    header: (currentPage: number) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          {
            text: (data.checklistName || 'Skills Checklist').toUpperCase(),
            style: 'pageHeader', margin: [48, 0, 0, 0],
          },
          {
            text: data.candidateName,
            fontSize: 10, color: CL_GRAY2, alignment: 'right', margin: [0, 0, 48, 0],
          },
        ],
        margin: [0, 12, 0, 0],
        canvas: [{ type: 'line', x1: -48, y1: 22, x2: 499, y2: 22, lineWidth: 0.5, lineColor: CL_BORDER }],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: 'MyZipVault \u2014 Skills Checklist', style: 'pageFooter', margin: [48, 0, 0, 0] },
          { text: `Page ${currentPage - 1} of ${pageCount - 1}`, style: 'pageFooter', alignment: 'right', margin: [0, 0, 48, 0] },
        ],
        margin: [0, 8, 0, 0],
        canvas: [{ type: 'line', x1: -48, y1: -8, x2: 499, y2: -8, lineWidth: 0.5, lineColor: CL_BORDER }],
      };
    },
  };

  return pdfDocToBuffer(docDefinition);
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
  const docId = `MZV-REF-${Date.now().toString(36).toUpperCase()}`;
  const verInput = `${data.nurseName}-${data.managerName}-${data.signatureDate}`;
  const verCode = verInput.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(16).toUpperCase().replace(/-/g, '0').padStart(8, '0').slice(0, 8);

  // Build Q&A table body — premium badges
  const qaBody: any[] = [
    [
      { text: '#', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, alignment: 'center', margin: [8, 10, 8, 10] },
      { text: 'Question', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, margin: [8, 10, 8, 10] },
      { text: 'Response', fillColor: '#0D9488', color: '#ffffff', bold: true, fontSize: 9, margin: [8, 10, 8, 10] },
    ],
  ];

  data.questions.forEach((q, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
    qaBody.push([
      { text: (i + 1).toString(), fontSize: 10, color: TEXT_MEDIUM, alignment: 'center', margin: [8, 8, 8, 8], fillColor: bg },
      { text: q.question, fontSize: 10, color: TEXT_DARK, margin: [8, 8, 8, 8], fillColor: bg },
      { text: q.answer, fontSize: 10, color: TEXT_DARK, margin: [8, 8, 8, 8], fillColor: bg },
    ]);
  });

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [48, 40, 48, 40],
    defaultStyle: { font: 'Roboto' },
    styles: {
      ...baseStyles,
      headerTitle: { fontSize: 22, bold: true, color: '#ffffff' },
    },
    header: (currentPage: number) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: 'PROFESSIONAL REFERENCE', fontSize: 9, bold: true, color: BRAND_COLOR, characterSpacing: 0.5, margin: [48, 12, 0, 0] },
          { text: data.nurseName, fontSize: 9, color: TEXT_MEDIUM, alignment: 'right', margin: [0, 12, 48, 0] },
        ],
        canvas: [{ type: 'line', x1: -48, y1: 26, x2: 599, y2: 26, lineWidth: 0.5, lineColor: BORDER_COLOR }],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Professional Reference', style: 'footer', margin: [48, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', margin: [0, 0, 48, 0], alignment: 'right' },
        ],
        canvas: [{ type: 'line', x1: -48, y1: -6, x2: 599, y2: -6, lineWidth: 0.5, lineColor: BORDER_COLOR }],
        margin: [0, 8, 0, 0],
      };
    },
    content: [
      // Premium gradient header
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 52, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 52, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 52, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },
      {
        text: 'PROFESSIONAL REFERENCE',
        fontSize: 22, bold: true, color: '#ffffff',
        absolutePosition: { x: 48, y: 15 },
      },
      { text: '', margin: [0, 16] },

      // Info section — premium info cards
      {
        columns: [
          { width: '48%', stack: [infoCard('NURSE / CANDIDATE', data.nurseName)] },
          { width: '4%', text: '' },
          { width: '48%', stack: [infoCard('EMPLOYMENT STATUS', data.employmentStatus, { valueColor: BRAND_COLOR })] },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        columns: [
          { width: '48%', stack: [infoCard('REFERENCE MANAGER', data.managerName)] },
          { width: '4%', text: '' },
          { width: '48%', stack: [infoCard('FACILITY', data.facility)] },
        ],
        margin: [0, 0, 0, 20],
      },

      // Q&A table — premium
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*'],
          body: qaBody,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.3,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1) ? BRAND_COLOR : '#F3F4F6',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 20],
      },

      // Overall comment — premium card
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'OVERALL COMMENT', fontSize: 9, bold: true, color: BRAND_COLOR, characterSpacing: 0.8, margin: [0, 0, 0, 8] },
            { text: data.overallComment || 'No comment provided.', fontSize: 10, color: TEXT_MEDIUM, lineHeight: 1.6, italics: !data.overallComment },
          ],
          fillColor: '#F8FAFC', border: [false, false, false, false], margin: [20, 16, 20, 16],
        }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => BORDER_COLOR, vLineColor: () => BORDER_COLOR },
        margin: [0, 0, 0, 20],
      },

      // Attestation — premium card
      createBrandLine(),
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'ATTESTATION', fontSize: 9, bold: true, color: TEXT_LIGHT, characterSpacing: 1, margin: [0, 0, 0, 10] },
            { text: data.attestationText, fontSize: 10, color: TEXT_MEDIUM, lineHeight: 1.7, italics: true },
          ],
          fillColor: '#F8FAFC', border: [false, false, false, false], margin: [24, 20, 24, 20],
        }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => BORDER_COLOR, vLineColor: () => BORDER_COLOR },
        margin: [0, 0, 0, 24],
      },

      // Signature — premium
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'SIGNED BY', fontSize: 8, color: TEXT_LIGHT, bold: true, characterSpacing: 0.8 },
              { text: data.signatureName, fontSize: 14, bold: true, color: TEXT_DARK, margin: [0, 4, 0, 0] },
              { text: '', margin: [0, 12, 0, 0] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 0, 0, 4] },
              { text: 'Signature', fontSize: 8, color: TEXT_LIGHT, characterSpacing: 0.8 },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'DATE SIGNED', fontSize: 8, color: TEXT_LIGHT, bold: true, characterSpacing: 0.8 },
              { text: data.signatureDate, fontSize: 14, bold: true, color: BRAND_COLOR, margin: [0, 4, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Verification box
      verificationBox(docId, verCode),

      // Bottom branding
      { text: '', margin: [0, 20, 0, 0] },
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 3, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 3, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 3, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },
      { text: '', margin: [0, 8, 0, 0] },
      {
        stack: [
          { text: 'Generated by MyZipVault', fontSize: 9, color: TEXT_LIGHT, alignment: 'center' },
          { text: 'Secure Healthcare Credential Verification Platform', fontSize: 8, color: '#C4C4C4', alignment: 'center', margin: [0, 2, 0, 0] },
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
    pageMargins: [48, 40, 48, 40],
    defaultStyle: { font: 'Roboto' },
    styles: {
      ...baseStyles,
      nameTitle: {
        fontSize: 32,
        bold: true,
        color: BRAND_COLOR,
        margin: [0, 0, 0, 4],
      },
      contactInfo: {
        fontSize: 10,
        color: TEXT_MEDIUM,
        margin: [0, 0, 0, 2],
      },
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: BRAND_COLOR,
        characterSpacing: 0.8,
        margin: [0, 16, 0, 8],
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
      // Top gradient accent bar
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 6, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 6, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 6, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },

      // Name
      { text: '', margin: [0, 16, 0, 0] },
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

      // Skills — premium badge layout
      { text: 'SKILLS', style: 'sectionHeader' },
      {
        table: { widths: ['*'], body: [[{
          text: data.skills.join('  •  '),
          fontSize: 10, color: TEXT_DARK, lineHeight: 1.6,
          margin: [14, 10, 14, 10],
        }]] },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 10],
        fillColor: '#F0FDFA',
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

      // Bottom branding
      { text: '', margin: [0, 24, 0, 0] },
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 200, h: 3, color: BRAND_COLOR },
          { type: 'rect', x: 200, y: 0, w: 200, h: 3, color: '#0D9488' },
          { type: 'rect', x: 400, y: 0, w: 197, h: 3, color: '#06B6D4' },
        ],
        margin: [-48, 0, -48, 0],
      },
      { text: '', margin: [0, 6, 0, 0] },
      {
        columns: [
          { text: 'Generated by MyZipVault', fontSize: 8, color: TEXT_LIGHT, width: '*' },
          { text: 'www.myzipvault.com', fontSize: 8, color: TEXT_LIGHT, alignment: 'right', width: 'auto' },
        ],
      },
    ],
  };

  return pdfDocToBuffer(docDefinition);
}
