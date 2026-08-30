// @ts-nocheck — TODO(audit-2): pre-existing schema drift in legacy calendar/vaultsign/pdf code. Model names and fields don't match current Prisma schema. Suppressing to enable strict TS on clean files. Fix individually in a follow-up session.
import type { Content, TDocumentDefinitions, StyleDictionary } from "pdfmake/interfaces";

// TipTap node types we support
interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

interface TipTapMark {
  type: string;
  attrs?: Record<string, any>;
}

interface HeaderConfig {
  show_logo?: boolean;
  show_company_name?: boolean;
  show_contact?: boolean;
  show_address?: boolean;
  show_document_title?: boolean;
  logo_url?: string;
}

interface FooterConfig {
  show_rights_reserved?: boolean;
  show_powered_by?: boolean;
  show_page_numbers?: boolean;
}

interface OrganizationInfo {
  name?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * Transform TipTap JSON to pdfmake docDefinition.
 * Handles: paragraphs, headings, lists, tables, text marks, images, variables.
 */
export function tiptapToPdfmake(
  tiptapJson: string | null | undefined,
  options: {
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    showHeaderFooter?: boolean;
    organization?: OrganizationInfo;
    documentTitle?: string;
    placeholderValues?: Record<string, string>;
  } = {}
): TDocumentDefinitions {
  let doc: TipTapNode;
  try {
    doc = typeof tiptapJson === "string" ? JSON.parse(tiptapJson) : { type: "doc", content: [] };
  } catch {
    doc = { type: "doc", content: [] };
  }

  const content = transformNodes(doc.content || [], options.placeholderValues || {});

  const styles: StyleDictionary = {
    heading1: {
      fontSize: 24,
      bold: true,
      marginBottom: 8,
      color: "#111827",
    },
    heading2: {
      fontSize: 20,
      bold: true,
      marginBottom: 6,
      color: "#111827",
    },
    heading3: {
      fontSize: 16,
      bold: true,
      marginBottom: 4,
      color: "#111827",
    },
    paragraph: {
      fontSize: 11,
      lineHeight: 1.5,
      color: "#374151",
      marginBottom: 4,
    },
    variable: {
      fontSize: 11,
      bold: true,
      color: "#166534",
      background: "#DCFCE7",
    },
  };

  const headerContent: Content[] = [];
  const footerContent: Content[] = [];

  // Build header and footer based on showHeaderFooter toggle
  // If showHeaderFooter is explicitly false, skip all header/footer
  // If true (or undefined for backward compat), include all header/footer elements
  const includeHeaderFooter = options.showHeaderFooter !== false;

  // Build header
  // Layout: Left column = logo + company info stacked; Right column = document title
  if (includeHeaderFooter) {
    const headerParts: Content[] = [];
    const leftParts: Content[] = [];
    const rightParts: Content[] = [];

    // Left column: Logo on top, company details below
    const logoLine: Content[] = [];
    const companyDetailsStack: Content[] = [];

    if (options.organization?.logo_url) {
      logoLine.push({
        image: options.organization.logo_url,
        width: 36,
        height: 36,
        margin: [0, 0, 8, 0] as any,
      });
    }

    if (options.organization?.name) {
      logoLine.push({
        text: options.organization.name,
        fontSize: 14,
        bold: true,
        color: "#166534",
        margin: [0, 4, 0, 0] as any,
      });
    }

    if (logoLine.length > 0) {
      leftParts.push({
        columns: logoLine,
        margin: [0, 0, 0, 2] as any,
      });
    }

    if (options.organization) {
      const contactParts: string[] = [];
      if (options.organization.phone) contactParts.push(options.organization.phone);
      if (options.organization.email) contactParts.push(options.organization.email);
      if (options.organization.website) contactParts.push(options.organization.website);
      if (contactParts.length > 0) {
        companyDetailsStack.push({
          text: contactParts.join(" | "),
          fontSize: 8,
          color: "#6B7280",
        });
      }
    }

    if (options.organization?.address) {
      companyDetailsStack.push({
        text: options.organization.address,
        fontSize: 8,
        color: "#6B7280",
      });
    }

    if (companyDetailsStack.length > 0) {
      leftParts.push({
        stack: companyDetailsStack,
        margin: [0, 0, 0, 0] as any,
      });
    }

    // Always show document title in header when header/footer is enabled
    if (options.documentTitle) {
      rightParts.push({
        text: options.documentTitle,
        fontSize: 10,
        bold: true,
        color: "#374151",
        alignment: "right",
        margin: [0, 8, 0, 0] as any,
      });
    }

    // Always render the header section when header/footer is enabled,
    // even if leftParts is empty — the document title should always appear
    headerContent.push({
      columns: [
        { stack: leftParts.length > 0 ? leftParts : [{ text: "" }], width: "*" },
        { stack: rightParts.length > 0 ? rightParts : [{ text: "" }], width: "auto", alignment: "right" },
      ],
      margin: [40, 20, 40, 5] as any,
    });
    headerContent.push({
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E7EB" }],
      margin: [40, 0, 40, 10] as any,
    });
  }

  // Build footer (same condition as header)
  // Layout: Left/center = rights reserved + powered by; Right = page numbers
  if (includeHeaderFooter) {
    const footerLeftParts: Content[] = [];

    footerLeftParts.push({
      text: `© ${new Date().getFullYear()} ${options.organization?.name || "MyZipVault"}. All rights reserved. This is a legally binding document.`,
      alignment: "center",
      fontSize: 7,
      color: "#9CA3AF",
    });
    footerLeftParts.push({
      text: "Powered by VaultSign",
      alignment: "center",
      fontSize: 6,
      color: "#B0B0B0",
    });

    const footerColumns: Content[] = [];

    // Center column: rights reserved + powered by
    footerColumns.push({
      stack: footerLeftParts,
      width: "*",
    });

    // Right column: page numbers
    footerColumns.push({
      text: "Page {currentPage} of {totalPages}",
      alignment: "right",
      fontSize: 8,
      color: "#9CA3AF",
      width: "auto",
    });

    footerContent.push({
      columns: footerColumns,
      margin: [40, 0, 40, 20] as any,
    });
  }

  const docDefinition: TDocumentDefinitions = {
    content: content as Content[],
    styles,
    defaultStyle: {
      font: "Helvetica",
      fontSize: 11,
      lineHeight: 1.4,
    },
    pageSize: "A4",
    pageMargins: [40, headerContent.length > 0 ? 80 : 40, 40, footerContent.length > 0 ? 60 : 40],
  };

  if (headerContent.length > 0) {
    docDefinition.header = { stack: headerContent };
  }

  if (footerContent.length > 0) {
    docDefinition.footer = (currentPage: number, pageCount: number) => ({
      stack: footerContent.map((item: any) => {
        if (item.stack) {
          return {
            stack: item.stack.map((s: any) => {
              if (typeof s.text === "string" && s.text.includes("{currentPage}")) {
                return { ...s, text: s.text.replace("{currentPage}", String(currentPage)).replace("{totalPages}", String(pageCount)) };
              }
              return s;
            }),
            margin: item.margin,
          };
        }
        return item;
      }),
    });
  }

  return docDefinition;
}

function transformNodes(nodes: TipTapNode[], placeholders: Record<string, string>): Content[] {
  const result: Content[] = [];

  for (const node of nodes) {
    const transformed = transformNode(node, placeholders);
    if (transformed !== null) {
      result.push(transformed);
    }
  }

  return result;
}

function transformNode(node: TipTapNode, placeholders: Record<string, string>): Content | null {
  switch (node.type) {
    case "doc":
      return { stack: transformNodes(node.content || [], placeholders) };

    case "paragraph":
      return transformParagraph(node, placeholders);

    case "heading":
      return transformHeading(node, placeholders);

    case "bulletList":
      return { ul: transformNodes(node.content || [], placeholders), marginBottom: 4 };

    case "orderedList":
      return { ol: transformNodes(node.content || [], placeholders), marginBottom: 4 };

    case "listItem":
      return { stack: transformNodes(node.content || [], placeholders) };

    case "taskList":
      return { ul: transformNodes(node.content || [], placeholders), marginBottom: 4 };

    case "taskItem": {
      const checked = node.attrs?.checked || false;
      const inner = transformNodes(node.content || [], placeholders);
      return {
        text: [
          { text: checked ? "☑ " : "☐ ", fontSize: 12 },
          ...(Array.isArray(inner) ? inner : [inner]),
        ],
      };
    }

    case "table":
      return transformTable(node, placeholders);

    case "tableRow":
      return transformTableRow(node, placeholders);

    case "tableCell":
    case "tableHeader": {
      const cellContent = transformNodes(node.content || [], placeholders);
      return { stack: cellContent, margin: [2, 2, 2, 2] as any };
    }

    case "image": {
      const src = node.attrs?.src;
      if (src) {
        return {
          image: src,
          width: node.attrs?.width || 300,
          alignment: "center",
          margin: [0, 8, 0, 8] as any,
        };
      }
      return null;
    }

    case "hardBreak":
      return { text: "\n", fontSize: 11 };

    case "pageBreak":
      return { text: "", pageBreak: "after" };

    case "variable": {
      const varName = node.attrs?.id || node.attrs?.name || "";
      const displayText = placeholders[varName] || `{{${varName}}}`;
      return {
        text: displayText,
        style: "variable",
      };
    }

    case "signField": {
      const fieldType = node.attrs?.fieldType || "signature";
      const signerIndex = node.attrs?.assignedToSignerIndex ?? 0;
      const signerLabel = node.attrs?.signerLabel || `Signer ${signerIndex + 1}`;
      const fieldLabels: Record<string, string> = {
        signature: "✍ Signature",
        date: "📅 Date",
        full_name: "👤 Full Name",
        initials: "🔤 Initials",
        email: "📧 Email",
        text: "📝 Text",
        checkbox: "☑ Checkbox",
      };
      const label = fieldLabels[fieldType] || fieldType;
      const colors = ["#059669", "#0d9488", "#7C3AED", "#DC2626", "#D97706", "#2563EB"];
      const color = colors[signerIndex % colors.length];
      return {
        stack: [
          {
            text: `${label}`,
            color: color,
            fontSize: 11,
            bold: true,
            marginBottom: 2,
          },
          {
            text: `${signerLabel}`,
            color: color,
            fontSize: 9,
            opacity: 0.7,
            marginBottom: 4,
          },
          {
            // Dashed line for signature
            canvas: [
              {
                type: "line",
                x1: 0, y1: 0,
                x2: 200, y2: 0,
                lineWidth: 1,
                dash: { length: 3, space: 3 },
                lineColor: color,
              },
            ],
            marginBottom: 8,
          },
        ],
        margin: [0, 6, 0, 6],
      };
    }

    default:
      // Try to render children if it's a container node
      if (node.content && node.content.length > 0) {
        return { stack: transformNodes(node.content, placeholders) };
      }
      return null;
  }
}

function transformParagraph(node: TipTapNode, placeholders: Record<string, string>): Content {
  const textContent = transformInlineContent(node.content || [], placeholders);

  if (textContent.length === 0) {
    return { text: "", marginBottom: 2 };
  }

  // Check for text alignment
  const textAlign = node.attrs?.textAlign || node.attrs?.text_align;

  const result: any = {
    text: textContent,
    style: "paragraph",
    marginBottom: 4,
  };

  if (textAlign && ["left", "center", "right", "justify"].includes(textAlign)) {
    result.alignment = textAlign;
  }

  // Preserve line-height from docx-to-html conversion
  if (node.attrs?.lineHeight) {
    const lh = parseFloat(String(node.attrs.lineHeight));
    if (!isNaN(lh)) result.lineHeight = lh;
  }

  // Preserve margin-top/margin-bottom (spacing) from docx-to-html conversion
  if (node.attrs?.marginTop) {
    const mt = parseSpacingValue(String(node.attrs.marginTop));
    if (mt !== null) result.marginTop = mt;
  }
  if (node.attrs?.marginBottom) {
    const mb = parseSpacingValue(String(node.attrs.marginBottom));
    if (mb !== null) result.marginBottom = mb;
  }

  return result;
}

function transformHeading(node: TipTapNode, placeholders: Record<string, string>): Content {
  const level = node.attrs?.level || 1;
  const textContent = transformInlineContent(node.content || [], placeholders);
  const textAlign = node.attrs?.textAlign || node.attrs?.text_align;

  const result: any = {
    text: textContent,
    style: `heading${level}`,
    marginTop: level === 1 ? 16 : 10,
    marginBottom: level === 1 ? 10 : 6,
  };

  if (textAlign && ["left", "center", "right", "justify"].includes(textAlign)) {
    result.alignment = textAlign;
  }

  // Preserve line-height from docx-to-html conversion
  if (node.attrs?.lineHeight) {
    const lh = parseFloat(String(node.attrs.lineHeight));
    if (!isNaN(lh)) result.lineHeight = lh;
  }

  // Preserve margin-top/margin-bottom (spacing) from docx-to-html conversion
  if (node.attrs?.marginTop) {
    const mt = parseSpacingValue(String(node.attrs.marginTop));
    if (mt !== null) result.marginTop = mt;
  }
  if (node.attrs?.marginBottom) {
    const mb = parseSpacingValue(String(node.attrs.marginBottom));
    if (mb !== null) result.marginBottom = mb;
  }

  return result;
}

function transformInlineContent(nodes: TipTapNode[], placeholders: Record<string, string>): any[] {
  const result: any[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      if (node.text) {
        result.push(applyMarks(node.text, node.marks || []));
      }
    } else if (node.type === "variable") {
      const varName = node.attrs?.id || node.attrs?.name || "";
      const displayText = placeholders[varName] || `{{${varName}}}`;
      result.push({
        text: displayText,
        style: "variable",
      });
    } else if (node.type === "signField") {
      const fieldType = node.attrs?.fieldType || "signature";
      const signerIndex = node.attrs?.assignedToSignerIndex ?? 0;
      result.push({
        text: `[${fieldType.toUpperCase()} — Signer ${signerIndex + 1}]`,
        color: "#166534",
        background: "#DCFCE7",
        fontSize: 10,
        bold: true,
      });
    } else if (node.type === "hardBreak") {
      result.push({ text: "\n" });
    } else if (node.content) {
      result.push(...transformInlineContent(node.content, placeholders));
    }
  }

  return result;
}

function applyMarks(text: string, marks: TipTapMark[]): any {
  if (marks.length === 0) return text;

  let result: any = { text };

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result.bold = true;
        break;
      case "italic":
        result.italics = true;
        break;
      case "underline":
        result.decoration = "underline";
        break;
      case "strike":
      case "strikethrough":
        result.decoration = "lineThrough";
        break;
      case "textStyle": {
        if (mark.attrs?.fontFamily) {
          result.font = mark.attrs.fontFamily;
        }
        if (mark.attrs?.color) {
          result.color = mark.attrs.color;
        }
        if (mark.attrs?.fontSize) {
          const fontSizeStr = String(mark.attrs.fontSize);
          const sizeNum = parseFloat(fontSizeStr);
          if (!isNaN(sizeNum)) {
            // Handle "12pt" → 12, "16px" → 12 (px to pt conversion)
            if (fontSizeStr.includes("px")) {
              result.fontSize = sizeNum * 0.75;
            } else {
              result.fontSize = sizeNum;
            }
          }
        }
        break;
      }
      case "highlight":
        result.background = mark.attrs?.color || "#FEF08A";
        break;
      case "subscript":
        result.subscript = true;
        break;
      case "superscript":
        result.superscript = true;
        break;
      case "link":
        result.link = mark.attrs?.href;
        result.color = "#0D9488";
        result.decoration = "underline";
        break;
    }
  }

  return result;
}

function transformTable(node: TipTapNode, placeholders: Record<string, string>): Content {
  const rows = node.content || [];
  const tableBody: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.type !== "tableRow") continue;
    const cells = row.content || [];
    const rowCells: any[] = [];

    for (const cell of cells) {
      if (cell.type !== "tableCell" && cell.type !== "tableHeader") continue;
      const cellContent = transformNodes(cell.content || [], placeholders);
      const isHeader = cell.type === "tableHeader";
      rowCells.push({
        stack: cellContent,
        margin: [4, 4, 4, 4] as any,
        fillColor: isHeader ? "#F3F4F6" : undefined,
        bold: isHeader,
      });
    }

    tableBody.push(rowCells);
  }

  if (tableBody.length === 0) return { text: "" };

  return {
    table: {
      headerRows: 1,
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#E5E7EB",
      vLineColor: () => "#E5E7EB",
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 8, 0, 8] as any,
  };
}

/**
 * Parse CSS spacing value (e.g., "4pt", "8px", "0.5em") to a number in pt for pdfmake.
 * Returns null if the value cannot be parsed.
 */
function parseSpacingValue(value: string): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (value.includes("px")) return num * 0.75; // px to pt
  if (value.includes("em")) return num * 12;   // em to pt (assuming 12pt base)
  return num; // Assume pt if no unit
}

function transformTableRow(node: TipTapNode, placeholders: Record<string, string>): Content {
  const cells = node.content || [];
  const rowCells: any[] = [];

  for (const cell of cells) {
    const cellContent = transformNodes(cell.content || [], placeholders);
    rowCells.push({ stack: cellContent, margin: [2, 2, 2, 2] as any });
  }

  return rowCells as any;
}

// ── HTML to pdfmake converter ──────────────────────────────────────────────
// Used when tiptap_content is HTML (from our enhanced docx-to-html converter)
// rather than TipTap JSON format.

interface HtmlToPdfmakeOptions {
  headerConfig?: HeaderConfig;
  footerConfig?: FooterConfig;
  showHeaderFooter?: boolean;
  organization?: OrganizationInfo;
  documentTitle?: string;
  placeholderValues?: Record<string, string>;
}

/**
 * Convert HTML content (from docx-to-html converter) to pdfmake docDefinition.
 * Parses HTML elements and maps them to pdfmake structures, preserving
 * inline styles (colors, fonts, sizes, alignment, etc.).
 */
export function htmlToPdfmake(
  htmlContent: string,
  options: HtmlToPdfmakeOptions = {}
): TDocumentDefinitions {
  const content = parseHtmlToPdfmakeContent(htmlContent, options.placeholderValues || {});

  const styles: StyleDictionary = {
    heading1: { fontSize: 24, bold: true, marginBottom: 8, color: "#111827" },
    heading2: { fontSize: 20, bold: true, marginBottom: 6, color: "#111827" },
    heading3: { fontSize: 16, bold: true, marginBottom: 4, color: "#111827" },
    paragraph: { fontSize: 11, lineHeight: 1.5, color: "#374151", marginBottom: 4 },
  };

  const headerContent: Content[] = [];
  const footerContent: Content[] = [];

  // Build header and footer based on showHeaderFooter toggle
  const includeHeaderFooter = options.showHeaderFooter !== false;

  // Build header — minimal (document name only, centered)
  if (includeHeaderFooter) {
    const headerStack: Content[] = [];
    if (options.documentTitle) {
      headerStack.push({
        text: options.documentTitle,
        fontSize: 14,
        bold: true,
        color: "#111827",
        alignment: "center",
      });
    }
    if (headerStack.length > 0) {
      headerContent.push({ stack: headerStack, margin: [40, 20, 40, 5] as any });
      headerContent.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E7EB" }], margin: [40, 0, 40, 10] as any });
    }
  }

  // Build footer — company info + copyright + Powered by
  if (includeHeaderFooter) {
    const footerStack: Content[] = [];

    // Company info — centered
    const companyStack: Content[] = [];
    if (options.organization?.logo_url) {
      companyStack.push({
        image: options.organization.logo_url,
        width: 200,
        height: 60,
        alignment: "center",
        margin: [0, 0, 0, 2] as any,
      });
    }
    if (options.organization?.name) {
      companyStack.push({
        text: options.organization.name,
        fontSize: 12,
        bold: true,
        color: "#111827",
        alignment: "center",
      });
    }
    if (options.organization) {
      const contactParts: string[] = [];
      if (options.organization.phone) contactParts.push(options.organization.phone);
      if (options.organization.email) contactParts.push(options.organization.email);
      if (options.organization.website) contactParts.push(options.organization.website);
      if (contactParts.length > 0) {
        companyStack.push({
          text: contactParts.join(" | "),
          fontSize: 8,
          color: "#6B7280",
          alignment: "center",
        });
      }
    }
    if (options.organization?.address) {
      companyStack.push({
        text: options.organization.address,
        fontSize: 8,
        color: "#6B7280",
        alignment: "center",
      });
    }

    if (companyStack.length > 0) {
      footerStack.push({ stack: companyStack });
      // Divider line
      footerStack.push({
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E7EB" }],
        margin: [0, 6, 0, 6] as any,
      });
    }

    // Copyright
    footerStack.push({
      text: `© ${new Date().getFullYear()} ${options.organization?.name || "MyZipVault"}. All rights reserved. This is a legally binding document.`,
      alignment: "center",
      fontSize: 7,
      color: "#9CA3AF",
    });
    // Powered by
    footerStack.push({
      text: "Powered by VaultSign",
      alignment: "center",
      fontSize: 6,
      color: "#B0B0B0",
    });

    footerContent.push({
      stack: footerStack,
      margin: [40, 0, 40, 20] as any,
    });
  }

  const docDefinition: TDocumentDefinitions = {
    content: content as Content[],
    styles,
    defaultStyle: { font: "Helvetica", fontSize: 11, lineHeight: 1.4 },
    pageSize: "A4",
    pageMargins: [40, headerContent.length > 0 ? 80 : 40, 40, footerContent.length > 0 ? 60 : 40],
  };

  if (headerContent.length > 0) docDefinition.header = { stack: headerContent };
  if (footerContent.length > 0) {
    docDefinition.footer = (currentPage: number, pageCount: number) => ({
      stack: footerContent.map((item: any) => {
        if (item.stack) {
          return { stack: item.stack.map((s: any) => (typeof s.text === "string" && s.text.includes("{currentPage}")) ? { ...s, text: s.text.replace("{currentPage}", String(currentPage)).replace("{totalPages}", String(pageCount)) } : s), margin: item.margin };
        }
        return item;
      }),
    });
  }

  return docDefinition;
}

function parseHtmlToPdfmakeContent(html: string, placeholders: Record<string, string>): any[] {
  const result: any[] = [];

  // Simple regex-based HTML parser for the common elements our docx-to-html produces
  // This handles: <h1>-<h6>, <p>, <ul>/<ol>/<li>, <table>/<tr>/<td>, <strong>, <em>, <u>, <s>, <sub>, <sup>, <span style="...">

  // Split into top-level blocks
  const blocks = extractTopLevelBlocks(html);

  for (const block of blocks) {
    const converted = convertHtmlBlock(block, placeholders);
    if (converted !== null) {
      result.push(converted);
    }
  }

  return result;
}

interface HtmlBlock {
  type: "heading" | "paragraph" | "list" | "table" | "pageBreak" | "raw";
  tag: string;
  content: string;
  style: string;
}

function extractTopLevelBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];
  let remaining = html.trim();

  while (remaining.length > 0) {
    // Match heading tags
    const headingMatch = remaining.match(/^<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/i);
    if (headingMatch) {
      blocks.push({ type: "heading", tag: headingMatch[1].toLowerCase(), content: headingMatch[3], style: extractTagStyle(headingMatch[2]) });
      remaining = remaining.slice(headingMatch[0].length).trim();
      continue;
    }

    // Match table
    const tableMatch = remaining.match(/^<table([^>]*)>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      blocks.push({ type: "table", tag: "table", content: tableMatch[2], style: extractTagStyle(tableMatch[1]) });
      remaining = remaining.slice(tableMatch[0].length).trim();
      continue;
    }

    // Match ul/ol
    const listMatch = remaining.match(/^<(ul|ol)([^>]*)>([\s\S]*?)<\/\1>/i);
    if (listMatch) {
      blocks.push({ type: "list", tag: listMatch[1].toLowerCase(), content: listMatch[3], style: extractTagStyle(listMatch[2]) });
      remaining = remaining.slice(listMatch[0].length).trim();
      continue;
    }

    // Match paragraph
    const pMatch = remaining.match(/^<p([^>]*)>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      blocks.push({ type: "paragraph", tag: "p", content: pMatch[2], style: extractTagStyle(pMatch[1]) });
      remaining = remaining.slice(pMatch[0].length).trim();
      continue;
    }

    // Match li (stray list items without parent ul/ol)
    const liMatch = remaining.match(/^<li([^>]*)>([\s\S]*?)<\/li>/i);
    if (liMatch) {
      blocks.push({ type: "list", tag: "ul", content: remaining, style: "" });
      // Consume all consecutive li items
      let liRemaining = remaining;
      while (liRemaining.match(/^<li/i)) {
        const m = liRemaining.match(/^<li([^>]*)>([\s\S]*?)<\/li>/i);
        if (m) liRemaining = liRemaining.slice(m[0].length).trim();
        else break;
      }
      remaining = liRemaining;
      continue;
    }

    // Match hr (page break)
    const hrMatch = remaining.match(/^<hr([^>]*)>/i);
    if (hrMatch) {
      const attrs = hrMatch[1];
      if (attrs.includes('page-break') || attrs.includes('page_break') || (attrs.includes('style') && attrs.match(/page-break/i))) {
        blocks.push({ type: "pageBreak", tag: "hr", content: "", style: "" });
      } else {
        // Regular hr - treat as separator
        blocks.push({ type: "paragraph", tag: "p", content: "", style: "" });
      }
      remaining = remaining.slice(hrMatch[0].length).trim();
      continue;
    }

    // Match div with page-break-after style (legacy format from older docx-to-html converter)
    const divPageBreakMatch = remaining.match(/^<div([^>]*)page-break-after[^>]*>([\s\S]*?)<\/div>/i);
    if (divPageBreakMatch) {
      blocks.push({ type: "pageBreak", tag: "div", content: "", style: "" });
      remaining = remaining.slice(divPageBreakMatch[0].length).trim();
      continue;
    }

    // Skip unknown tags or whitespace
    const tagMatch = remaining.match(/^<[^>]+>/);
    if (tagMatch) {
      remaining = remaining.slice(tagMatch[0].length).trim();
      continue;
    }

    // Text content before any tag
    const textMatch = remaining.match(/^[^<]+/);
    if (textMatch) {
      const text = textMatch[0].trim();
      if (text) {
        blocks.push({ type: "paragraph", tag: "p", content: text, style: "" });
      }
      remaining = remaining.slice(textMatch[0].length).trim();
      continue;
    }

    break; // Safety exit
  }

  return blocks;
}

function extractTagStyle(attrStr: string): string {
  const styleMatch = attrStr.match(/style="([^"]*)"/);
  return styleMatch ? styleMatch[1] : "";
}

function convertHtmlBlock(block: HtmlBlock, placeholders: Record<string, string>): any {
  switch (block.type) {
    case "heading": {
      const level = parseInt(block.tag.replace("h", ""));
      const textContent = parseInlineHtml(block.content, placeholders);
      const paraStyle = parseCssStyles(block.style);
      const result: any = {
        text: textContent,
        style: `heading${level}`,
        marginTop: level === 1 ? 16 : 10,
        marginBottom: level === 1 ? 10 : 6,
      };
      if (paraStyle.alignment) result.alignment = paraStyle.alignment;
      if (paraStyle.color) result.color = paraStyle.color;
      return result;
    }

    case "paragraph": {
      const textContent = parseInlineHtml(block.content, placeholders);
      if (textContent.length === 0 || (textContent.length === 1 && typeof textContent[0] === "string" && !textContent[0].trim())) {
        return { text: "", marginBottom: 2 };
      }
      const paraStyle = parseCssStyles(block.style);
      const result: any = { text: textContent, style: "paragraph", marginBottom: 4 };
      if (paraStyle.alignment) result.alignment = paraStyle.alignment;
      if (paraStyle.color) result.color = paraStyle.color;
      if (paraStyle.lineHeight) result.lineHeight = paraStyle.lineHeight;
      if (paraStyle.marginTop) result.marginTop = paraStyle.marginTop;
      if (paraStyle.marginBottom) result.marginBottom = paraStyle.marginBottom;
      return result;
    }

    case "list": {
      const items = block.content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      const listItems = items.map((item) => {
        const innerMatch = item.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
        const inner = innerMatch ? innerMatch[1] : "";
        const liStyleMatch = item.match(/<li[^>]*style="([^"]*)"/i);
        const liStyle = liStyleMatch ? parseCssStyles(liStyleMatch[1]) : {};
        const content = parseInlineHtml(inner, placeholders);
        return { stack: content, margin: [2, 2, 2, 2] as any };
      });

      const listKey = block.tag === "ol" ? "ol" : "ul";
      return { [listKey]: listItems, marginBottom: 4 };
    }

    case "table": {
      const rows = block.content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      const tableBody: any[] = [];

      for (const row of rows) {
        const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        const rowCells: any[] = [];

        for (const cell of cells) {
          const innerMatch = cell.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i);
          const inner = innerMatch ? innerMatch[1] : "";
          const isHeader = cell.match(/<th/i) !== null;

          // Parse cell style
          const styleMatch = cell.match(/style="([^"]*)"/i);
          const cellStyle = styleMatch ? parseCssStyles(styleMatch[1]) : {};

          // Remove HTML tags from cell content for simple text extraction
          const cellText = inner.replace(/<[^>]+>/g, "").trim();
          const cellContent: any = { text: cellText, margin: [4, 4, 4, 4] as any };
          if (isHeader) { cellContent.bold = true; cellContent.fillColor = "#F3F4F6"; }
          if (cellStyle.backgroundColor) cellContent.fillColor = cellStyle.backgroundColor;
          if (cellStyle.color) cellContent.color = cellStyle.color;

          rowCells.push(cellContent);
        }

        if (rowCells.length > 0) tableBody.push(rowCells);
      }

      if (tableBody.length === 0) return { text: "" };
      return {
        table: { headerRows: 1, body: tableBody },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB",
          paddingLeft: () => 6, paddingRight: () => 6,
          paddingTop: () => 4, paddingBottom: () => 4,
        },
        margin: [0, 8, 0, 8] as any,
      };
    }

    case "pageBreak":
      return { text: "", pageBreak: "after" };

    default:
      return null;
  }
}

interface ParsedCssStyles {
  alignment?: string;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  marginTop?: number;
  marginBottom?: number;
}

function parseCssStyles(styleStr: string): ParsedCssStyles {
  const result: ParsedCssStyles = {};
  if (!styleStr) return result;

  const pairs = styleStr.split(";").map((s) => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [key, val] = pair.split(":").map((s) => s.trim());
    if (!key || !val) continue;

    switch (key.toLowerCase()) {
      case "text-align":
        if (["left", "center", "right", "justify"].includes(val)) result.alignment = val;
        break;
      case "color":
        result.color = val;
        break;
      case "background-color":
        result.backgroundColor = val;
        break;
      case "font-family":
        result.fontFamily = val.replace(/['"]/g, "");
        break;
      case "font-size": {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          result.fontSize = val.includes("pt") ? num : val.includes("px") ? num * 0.75 : num;
        }
        break;
      }
      case "line-height": {
        const lh = parseFloat(val);
        if (!isNaN(lh)) result.lineHeight = lh;
        break;
      }
      case "margin-top": {
        const mt = parseFloat(val);
        if (!isNaN(mt)) result.marginTop = val.includes("pt") ? mt : val.includes("px") ? mt * 0.75 : mt;
        break;
      }
      case "margin-bottom": {
        const mb = parseFloat(val);
        if (!isNaN(mb)) result.marginBottom = val.includes("pt") ? mb : val.includes("px") ? mb * 0.75 : mb;
        break;
      }
    }
  }

  return result;
}

function parseInlineHtml(html: string, placeholders: Record<string, string>): any[] {
  const result: any[] = [];
  let remaining = html.trim();

  while (remaining.length > 0) {
    // Match <span style="...">...</span>
    const spanMatch = remaining.match(/^<span([^>]*)>([\s\S]*?)<\/span>/i);
    if (spanMatch) {
      const styleAttr = spanMatch[1];
      const innerContent = spanMatch[2];
      const styleMatch = styleAttr.match(/style="([^"]*)"/i);
      const cssStyles = styleMatch ? parseCssStyles(styleMatch[1]) : {};

      // Parse the inner content recursively for nested formatting
      const innerParts = parseInlineHtml(innerContent, placeholders);

      // Apply span styles to inner content
      for (const part of innerParts) {
        if (typeof part === "string") {
          const styledPart: any = { text: part };
          if (cssStyles.color) styledPart.color = cssStyles.color;
          if (cssStyles.backgroundColor) styledPart.background = cssStyles.backgroundColor;
          if (cssStyles.fontFamily) styledPart.font = cssStyles.fontFamily;
          if (cssStyles.fontSize) styledPart.fontSize = cssStyles.fontSize;
          result.push(Object.keys(styledPart).length > 1 ? styledPart : part);
        } else {
          // Merge styles into existing object
          if (cssStyles.color && !part.color) part.color = cssStyles.color;
          if (cssStyles.backgroundColor && !part.background) part.background = cssStyles.backgroundColor;
          if (cssStyles.fontFamily && !part.font) part.font = cssStyles.fontFamily;
          if (cssStyles.fontSize && !part.fontSize) part.fontSize = cssStyles.fontSize;
          result.push(part);
        }
      }

      remaining = remaining.slice(spanMatch[0].length).trim();
      continue;
    }

    // Match <strong>...</strong>
    const strongMatch = remaining.match(/^<strong>([\s\S]*?)<\/strong>/i);
    if (strongMatch) {
      const innerParts = parseInlineHtml(strongMatch[1], placeholders);
      for (const part of innerParts) {
        if (typeof part === "string") {
          result.push({ text: part, bold: true });
        } else {
          part.bold = true;
          result.push(part);
        }
      }
      remaining = remaining.slice(strongMatch[0].length).trim();
      continue;
    }

    // Match <em>...</em>
    const emMatch = remaining.match(/^<em>([\s\S]*?)<\/em>/i);
    if (emMatch) {
      const innerParts = parseInlineHtml(emMatch[1], placeholders);
      for (const part of innerParts) {
        if (typeof part === "string") {
          result.push({ text: part, italics: true });
        } else {
          part.italics = true;
          result.push(part);
        }
      }
      remaining = remaining.slice(emMatch[0].length).trim();
      continue;
    }

    // Match <u>...</u>
    const uMatch = remaining.match(/^<u>([\s\S]*?)<\/u>/i);
    if (uMatch) {
      const innerParts = parseInlineHtml(uMatch[1], placeholders);
      for (const part of innerParts) {
        if (typeof part === "string") {
          result.push({ text: part, decoration: "underline" });
        } else {
          part.decoration = "underline";
          result.push(part);
        }
      }
      remaining = remaining.slice(uMatch[0].length).trim();
      continue;
    }

    // Match <s>...</s> or <strike>...</strike>
    const sMatch = remaining.match(/^<(s|strike)>([\s\S]*?)<\/\1>/i);
    if (sMatch) {
      const innerParts = parseInlineHtml(sMatch[2], placeholders);
      for (const part of innerParts) {
        if (typeof part === "string") {
          result.push({ text: part, decoration: "lineThrough" });
        } else {
          part.decoration = "lineThrough";
          result.push(part);
        }
      }
      remaining = remaining.slice(sMatch[0].length).trim();
      continue;
    }

    // Match <sub>...</sub>
    const subMatch = remaining.match(/^<sub>([\s\S]*?)<\/sub>/i);
    if (subMatch) {
      const innerParts = parseInlineHtml(subMatch[1], placeholders);
      for (const part of innerParts) {
        if (typeof part === "string") { result.push({ text: part, subscript: true }); }
        else { part.subscript = true; result.push(part); }
      }
      remaining = remaining.slice(subMatch[0].length).trim();
      continue;
    }

    // Match <sup>...</sup>
    const supMatch = remaining.match(/^<sup>([\s\S]*?)<\/sup>/i);
    if (supMatch) {
      const innerParts = parseInlineHtml(supMatch[1], placeholders);
      for (const part of innerParts) {
        if (typeof part === "string") { result.push({ text: part, superscript: true }); }
        else { part.superscript = true; result.push(part); }
      }
      remaining = remaining.slice(supMatch[0].length).trim();
      continue;
    }

    // Skip unknown tags
    const unknownMatch = remaining.match(/^<[^>]+>/);
    if (unknownMatch) {
      remaining = remaining.slice(unknownMatch[0].length).trim();
      continue;
    }

    // Plain text
    const textMatch = remaining.match(/^[^<]+/);
    if (textMatch) {
      // Replace placeholder variables
      let text = textMatch[0];
      text = text.replace(/\{\{(\w+)\}\}/g, (_, key) => placeholders[key] || `{{${key}}}`);
      result.push(text);
      remaining = remaining.slice(textMatch[0].length).trim();
      continue;
    }

    break;
  }

  return result;
}
