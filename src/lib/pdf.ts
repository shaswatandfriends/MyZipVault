// pdfmake has ESM/CJS compatibility issues with Turbopack, so we use dynamic import
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
// 3. Checklist PDF
// ─────────────────────────────────────────────────────────────

const RATING_LABELS: Record<string, string> = {
  '1': 'No Experience',
  '2': 'Limited Experience',
  '3': 'Experienced',
  '4': 'Proficient',
};

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
  // Group skills by category
  const categoryMap = new Map<string, Array<{ skillName: string; rating: string; isNa: boolean }>>();
  for (const skill of data.skills) {
    const list = categoryMap.get(skill.category) || [];
    list.push({ skillName: skill.skillName, rating: skill.rating, isNa: skill.isNa });
    categoryMap.set(skill.category, list);
  }
  const categories = Array.from(categoryMap.entries());

  // Build skill table body
  const skillTableBody: any[] = [
    [
      { text: 'Skill', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, margin: [6, 6, 6, 6] },
      { text: 'Rating', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
      { text: 'N/A', fillColor: BRAND_COLOR, color: '#ffffff', bold: true, fontSize: 9, alignment: 'center', margin: [6, 6, 6, 6] },
    ],
  ];

  for (const [category, skills] of categories) {
    // Category header row
    skillTableBody.push([
      { text: category, bold: true, fontSize: 9, color: BRAND_COLOR, fillColor: BRAND_LIGHT, colSpan: 3, margin: [6, 5, 6, 5] },
      {},
      {},
    ]);
    // Skill rows
    for (const skill of skills) {
      skillTableBody.push([
        { text: skill.skillName, fontSize: 9, color: TEXT_DARK, margin: [16, 4, 6, 4] },
        { text: skill.isNa ? '\u2014' : (RATING_LABELS[skill.rating] || skill.rating), fontSize: 9, color: TEXT_DARK, alignment: 'center', margin: [6, 4, 6, 4] },
        { text: skill.isNa ? '✓' : '', fontSize: 9, color: TEXT_DARK, alignment: 'center', margin: [6, 4, 6, 4] },
      ]);
    }
  }

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [50, 70, 50, 60],
    styles: baseStyles,
    header: (currentPage: number) => {
      if (currentPage === 1) return {};
      return {
        columns: [
          { text: data.checklistName, style: 'smallText', alignment: 'left', margin: [50, 20, 0, 0] },
          { text: data.candidateName, style: 'smallText', alignment: 'right', margin: [0, 20, 50, 0] },
        ],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'MyZipVault — Skills Checklist', style: 'footer', margin: [50, 0, 0, 0] },
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
        text: data.checklistName.toUpperCase(),
        fontSize: 20,
        bold: true,
        color: '#ffffff',
        absolutePosition: { x: 50, y: 12 },
      },
      { text: '', margin: [0, 10] },

      // Candidate info
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              {
                stack: [
                  { text: 'Candidate', style: 'label' },
                  { text: data.candidateName, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Specialty', style: 'label' },
                  { text: data.specialty, bold: true, fontSize: 11, color: TEXT_DARK },
                ],
                border: [true, true, true, true],
                fillColor: BRAND_LIGHT,
                margin: [8, 6, 8, 6],
              },
              {
                stack: [
                  { text: 'Date Completed', style: 'label' },
                  { text: data.completedDate, bold: true, fontSize: 11, color: TEXT_DARK },
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

      // Skills table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: skillTableBody,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i <= 1) ? BRAND_COLOR : BORDER_COLOR,
          vLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 20],
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
              // Show signature image if available, otherwise show a line
              ...(data.signatureBase64
                ? [{
                    image: data.signatureBase64.startsWith('data:')
                      ? data.signatureBase64
                      : `data:image/png;base64,${data.signatureBase64}`,
                    width: 180,
                    margin: [0, 0, 0, 4],
                  }]
                : [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: TEXT_DARK }], margin: [0, 30, 0, 4] }]
              ),
              { text: `Signed by: ${data.signatureName}`, fontSize: 9, color: TEXT_MEDIUM },
              { text: `Valid until: ${data.validUntil || 'N/A'}`, fontSize: 8, color: TEXT_LIGHT, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: `Date: ${data.signatureDate}`, fontSize: 9, color: TEXT_MEDIUM },
              ...(data.agencyName ? [{ text: `Agency: ${data.agencyName}`, fontSize: 8, color: TEXT_LIGHT, margin: [0, 2, 0, 0] }] : []),
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
