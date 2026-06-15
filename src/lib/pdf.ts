// pdfmake has ESM/CJS compatibility issues with Turbopack, so we use dynamic import
let printerInstance: any = null;

async function getPrinter(): Promise<any> {
  if (printerInstance) return printerInstance;
  
  // Dynamic import to handle ESM/CJS compatibility
  const pdfmake = await import('pdfmake');
  const PdfPrinter = pdfmake.default || pdfmake;
  
  const vfsFontsModule = await import('pdfmake/build/vfs_fonts');
  const vfs = (vfsFontsModule as any).default?.pdfMake?.vfs || (vfsFontsModule as any).pdfMake?.vfs || (vfsFontsModule as any).default || vfsFontsModule;
  
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
// 3. Checklist PDF — Premium Enterprise Design (pdfmake)
// ─────────────────────────────────────────────────────────────

const CL_GREEN = '#166534';
const CL_TEAL  = '#0D9488';
const CL_GREEN_LIGHT = '#DCFCE7';
const CL_TEAL_LIGHT  = '#CCFBF1';
const CL_WARN  = '#CA8A04';
const CL_WARN_LIGHT  = '#FEF9C3';
const CL_ERR   = '#DC2626';
const CL_ERR_LIGHT   = '#FEE2E2';
const CL_TEXT  = '#111827';
const CL_GRAY1 = '#374151';
const CL_GRAY2 = '#6B7280';
const CL_GRAY3 = '#9CA3AF';
const CL_BORDER = '#E5E7EB';
const CL_SURF  = '#F9FAFB';
const CL_SURF2 = '#F3F4F6';
const CL_GREEN_SURF = '#F0FDF4';
const CL_GREEN_BORDER = '#BBF7D0';

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

  // Top gradient bar (simulated with two rectangles)
  content.push({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 298, h: 8, color: CL_GREEN },
      { type: 'rect', x: 298, y: 0, w: 299, h: 8, color: CL_TEAL },
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

  // Bottom gradient bar
  content.push({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 298, h: 4, color: CL_GREEN },
      { type: 'rect', x: 298, y: 0, w: 299, h: 4, color: CL_TEAL },
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
