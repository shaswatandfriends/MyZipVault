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

  // Build header
  if (options.headerConfig) {
    const headerParts: Content[] = [];
    const leftParts: Content[] = [];
    const rightParts: Content[] = [];

    if (options.headerConfig.show_logo && options.organization?.logo_url) {
      leftParts.push({
        image: options.organization.logo_url,
        width: 40,
        height: 40,
        margin: [0, 0, 10, 0] as any,
      });
    }

    if (options.headerConfig.show_company_name && options.organization?.name) {
      leftParts.push({
        text: options.organization.name,
        fontSize: 14,
        bold: true,
        color: "#166534",
      });
    }

    if (options.headerConfig.show_contact && options.organization) {
      const contactParts: string[] = [];
      if (options.organization.phone) contactParts.push(options.organization.phone);
      if (options.organization.email) contactParts.push(options.organization.email);
      if (contactParts.length > 0) {
        rightParts.push({
          text: contactParts.join(" | "),
          fontSize: 8,
          color: "#6B7280",
          alignment: "right",
        });
      }
    }

    if (options.headerConfig.show_address && options.organization?.address) {
      rightParts.push({
        text: options.organization.address,
        fontSize: 8,
        color: "#6B7280",
        alignment: "right",
      });
    }

    if (leftParts.length > 0 || rightParts.length > 0) {
      headerContent.push({
        columns: [
          { stack: leftParts, width: "*" },
          { stack: rightParts, width: "auto", alignment: "right" },
        ],
        margin: [40, 20, 40, 5] as any,
      });
      headerContent.push({
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E7EB" }],
        margin: [40, 0, 40, 10] as any,
      });
    }
  }

  // Build footer
  if (options.footerConfig) {
    const footerParts: Content[] = [];
    if (options.footerConfig.show_page_numbers) {
      footerParts.push({
        text: "Page {currentPage} of {totalPages}",
        alignment: "center",
        fontSize: 8,
        color: "#9CA3AF",
      });
    }
    if (options.footerConfig.show_rights_reserved) {
      footerParts.push({
        text: `© ${new Date().getFullYear()} ${options.organization?.name || "MyZipVault"}. All rights reserved.`,
        alignment: "center",
        fontSize: 7,
        color: "#9CA3AF",
      });
    }
    if (options.footerConfig.show_powered_by) {
      footerParts.push({
        text: "Powered by VaultSign — MyZipVault",
        alignment: "center",
        fontSize: 7,
        color: "#9CA3AF",
      });
    }

    if (footerParts.length > 0) {
      footerContent.push({
        stack: footerParts,
        margin: [40, 0, 40, 20] as any,
      });
    }
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
      return {
        text: `[${fieldType.toUpperCase()} — Signer ${signerIndex + 1}]`,
        color: "#166534",
        background: "#DCFCE7",
        fontSize: 10,
        bold: true,
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
          const size = parseInt(mark.attrs.fontSize);
          if (!isNaN(size)) {
            result.fontSize = size;
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

function transformTableRow(node: TipTapNode, placeholders: Record<string, string>): Content {
  const cells = node.content || [];
  const rowCells: any[] = [];

  for (const cell of cells) {
    const cellContent = transformNodes(cell.content || [], placeholders);
    rowCells.push({ stack: cellContent, margin: [2, 2, 2, 2] as any });
  }

  return rowCells as any;
}
