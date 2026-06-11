/**
 * Enhanced .docx to HTML converter that preserves formatting.
 *
 * Mammoth intentionally strips visual formatting (colors, fonts, sizes, spacing).
 * This module parses the .docx XML directly to extract run-level and paragraph-level
 * formatting and generates HTML with inline styles that TipTap can understand.
 *
 * It falls back to mammoth for structure and uses our XML parser for styling.
 */

import JSZip from "jszip";
import mammoth from "mammoth";

// ── OOXML namespace helpers ────────────────────────────────────────────────

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function wTag(local: string): string {
  return `{${W_NS}}${local}`;
}

// ── XML element helpers ────────────────────────────────────────────────────

interface XElem {
  tag: string;
  attrs: Record<string, string>;
  children: XElem[];
  text?: string;
}

function parseXml(xmlStr: string): XElem {
  // Use our custom XML parser since Node.js doesn't have DOMParser natively
  return buildTree(xmlStr);
}

function buildTree(xml: string): XElem {
  // Simple recursive XML parser
  const root: XElem = { tag: "root", attrs: {}, children: [], text: "" };
  let current = root;
  const stack: XElem[] = [root];
  let i = 0;

  while (i < xml.length) {
    if (xml[i] === "<") {
      // Check for closing tag
      if (xml[i + 1] === "/") {
        const end = xml.indexOf(">", i);
        if (end === -1) break;
        // Pop the stack
        stack.pop();
        current = stack[stack.length - 1] || root;
        i = end + 1;
        continue;
      }

      // Check for self-closing or opening tag
      const tagEnd = xml.indexOf(">", i);
      if (tagEnd === -1) break;

      const tagContent = xml.substring(i + 1, tagEnd);
      const isSelfClosing = tagContent.endsWith("/");

      // Parse tag name and attributes
      const trimmed = isSelfClosing ? tagContent.slice(0, -1).trim() : tagContent.trim();
      const spaceIdx = trimmed.indexOf(" ");
      const tagName = spaceIdx > 0 ? trimmed.substring(0, spaceIdx) : trimmed;
      const attrStr = spaceIdx > 0 ? trimmed.substring(spaceIdx + 1) : "";

      const attrs: Record<string, string> = {};
      // Simple attribute parser
      const attrRegex = /(\w[:\w]*)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(attrStr)) !== null) {
        attrs[match[1]] = match[2];
      }

      const elem: XElem = { tag: tagName, attrs, children: [], text: "" };

      // Only add meaningful elements (skip XML declaration, comments, etc.)
      if (!tagName.startsWith("?") && !tagName.startsWith("!--")) {
        current.children.push(elem);
        if (!isSelfClosing) {
          stack.push(elem);
          current = elem;
        }
      }

      i = tagEnd + 1;
    } else {
      // Text content
      const nextTag = xml.indexOf("<", i);
      const text = nextTag > 0 ? xml.substring(i, nextTag) : xml.substring(i);
      if (current.text !== undefined) {
        current.text += text;
      }
      i = nextTag > 0 ? nextTag : xml.length;
    }
  }

  return root;
}

function findChildren(parent: XElem, tagName: string): XElem[] {
  return parent.children.filter((c) => c.tag === tagName || c.tag.endsWith(`:${tagName.split(":").pop()}`));
}

function findChild(parent: XElem, tagName: string): XElem | undefined {
  return parent.children.find((c) => c.tag === tagName || c.tag.endsWith(`:${tagName.split(":").pop()}`));
}

// ── Formatting extraction ──────────────────────────────────────────────────

interface RunFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number; // in pt
  subscript?: boolean;
  superscript?: boolean;
}

interface ParagraphFormatting {
  alignment?: "left" | "center" | "right" | "justify";
  spacingBefore?: number; // in twips
  spacingAfter?: number; // in twips
  lineHeight?: number; // multiplier
  indentationLeft?: number; // in twips
  indentationRight?: number;
  bulletLevel?: number;
  numberingId?: string;
  headingLevel?: number;
}

// Map common OOXML theme color values
function resolveColor(val: string | undefined, themeVal: string | undefined): string | undefined {
  if (!val && !themeVal) return undefined;
  // Direct hex color
  if (val && val !== "auto") {
    return val.startsWith("#") ? val : `#${val}`;
  }
  // Theme color mapping (simplified – maps common theme indices)
  const themeColors: Record<string, string> = {
    "1": "#000000", // dark1
    "2": "#FFFFFF", // light1
    "3": "#44546A", // dark2 (default blue-gray)
    "4": "#E7E6E6", // light2
    "5": "#4472C4", // accent1 (default blue)
    "6": "#ED7D31", // accent2 (default orange)
    "7": "#A5A5A5", // accent3 (default gray)
    "8": "#FFC000", // accent4 (default gold)
    "9": "#5B9BD5", // accent5 (default light blue)
    "0": "#70AD47", // accent6 (default green)
  };
  if (themeVal && themeColors[themeVal]) {
    return themeColors[themeVal];
  }
  return undefined;
}

function extractRunFormatting(rPr: XElem | undefined): RunFormatting {
  if (!rPr) return {};

  const fmt: RunFormatting = {};

  // Bold
  if (findChild(rPr, "w:b") || findChild(rPr, "w:bCs")) {
    fmt.bold = true;
  }

  // Italic
  if (findChild(rPr, "w:i") || findChild(rPr, "w:iCs")) {
    fmt.italic = true;
  }

  // Underline
  const u = findChild(rPr, "w:u");
  if (u && u.attrs["w:val"] && u.attrs["w:val"] !== "none") {
    fmt.underline = true;
  }

  // Strikethrough
  if (findChild(rPr, "w:strike")) {
    fmt.strike = true;
  }

  // Color
  const color = findChild(rPr, "w:color");
  if (color) {
    fmt.color = resolveColor(color.attrs["w:val"], color.attrs["w:themeColor"]);
  }

  // Highlight / background
  const highlight = findChild(rPr, "w:highlight");
  if (highlight && highlight.attrs["w:val"] && highlight.attrs["w:val"] !== "none") {
    const hlMap: Record<string, string> = {
      yellow: "#FFFF00", green: "#00FF00", cyan: "#00FFFF",
      magenta: "#FF00FF", blue: "#0000FF", red: "#FF0000",
      darkBlue: "#00008B", darkCyan: "#008B8B", darkGreen: "#006400",
      darkMagenta: "#8B008B", darkRed: "#8B0000", darkYellow: "#8B8B00",
      darkGray: "#808080", lightGray: "#C0C0C0", black: "#000000",
    };
    fmt.backgroundColor = hlMap[highlight.attrs["w:val"]] || highlight.attrs["w:val"];
  }

  // Shading (another way to set background in OOXML)
  const shading = findChild(rPr, "w:shd");
  if (shading && shading.attrs["w:fill"] && shading.attrs["w:fill"] !== "auto" && !fmt.backgroundColor) {
    fmt.backgroundColor = resolveColor(shading.attrs["w:fill"], undefined);
  }

  // Font family
  const rFonts = findChild(rPr, "w:rFonts");
  if (rFonts) {
    fmt.fontFamily = rFonts.attrs["w:ascii"] || rFonts.attrs["w:hAnsi"] || rFonts.attrs["w:cs"];
  }

  // Font size (w:sz is in half-points)
  const sz = findChild(rPr, "w:sz");
  if (sz && sz.attrs["w:val"]) {
    const halfPoints = parseInt(sz.attrs["w:val"]);
    if (!isNaN(halfPoints)) {
      fmt.fontSize = halfPoints / 2; // Convert half-points to points
    }
  }

  // Subscript/Superscript
  const vertAlign = findChild(rPr, "w:vertAlign");
  if (vertAlign) {
    if (vertAlign.attrs["w:val"] === "subscript") fmt.subscript = true;
    if (vertAlign.attrs["w:val"] === "superscript") fmt.superscript = true;
  }

  return fmt;
}

function extractParagraphFormatting(pPr: XElem | undefined): ParagraphFormatting {
  if (!pPr) return {};

  const fmt: ParagraphFormatting = {};

  // Alignment
  const jc = findChild(pPr, "w:jc");
  if (jc && jc.attrs["w:val"]) {
    const val = jc.attrs["w:val"];
    if (["left", "center", "right", "both"].includes(val)) {
      fmt.alignment = val === "both" ? "justify" : (val as any);
    }
  }

  // Spacing
  const spacing = findChild(pPr, "w:spacing");
  if (spacing) {
    if (spacing.attrs["w:before"]) fmt.spacingBefore = parseInt(spacing.attrs["w:before"]);
    if (spacing.attrs["w:after"]) fmt.spacingAfter = parseInt(spacing.attrs["w:after"]);
    if (spacing.attrs["w:line"]) {
      const lineVal = parseInt(spacing.attrs["w:line"]);
      const lineRule = spacing.attrs["w:lineRule"] || "auto";
      if (lineRule === "auto") {
        fmt.lineHeight = lineVal / 240; // OOXML auto line spacing: 240 = single
      } else {
        // AtLeast or Exact: convert twips to approximate multiplier
        fmt.lineHeight = lineVal / 240;
      }
    }
  }

  // Indentation
  const ind = findChild(pPr, "w:ind");
  if (ind) {
    if (ind.attrs["w:left"]) fmt.indentationLeft = parseInt(ind.attrs["w:left"]);
    if (ind.attrs["w:right"]) fmt.indentationRight = parseInt(ind.attrs["w:right"]);
  }

  // Numbering (for lists)
  const numPr = findChild(pPr, "w:numPr");
  if (numPr) {
    const ilvl = findChild(numPr, "w:ilvl");
    const numId = findChild(numPr, "w:numId");
    if (ilvl) fmt.bulletLevel = parseInt(ilvl.attrs["w:val"] || "0");
    if (numId) fmt.numberingId = numId.attrs["w:val"];
  }

  // Heading level (via pStyle)
  const pStyle = findChild(pPr, "w:pStyle");
  if (pStyle && pStyle.attrs["w:val"]) {
    const styleVal = pStyle.attrs["w:val"];
    if (styleVal.startsWith("Heading") || styleVal.startsWith("heading")) {
      const level = parseInt(styleVal.replace(/^[Hh]eading/, ""));
      if (!isNaN(level) && level >= 1 && level <= 6) {
        fmt.headingLevel = level;
      }
    }
    // Common Word heading styles
    if (styleVal === "Title") fmt.headingLevel = 1;
    if (styleVal === "Subtitle") fmt.headingLevel = 2;
  }

  return fmt;
}

// ── HTML generation ────────────────────────────────────────────────────────

function runFormatToStyles(fmt: RunFormatting): string {
  const styles: string[] = [];
  if (fmt.color) styles.push(`color: ${fmt.color}`);
  if (fmt.backgroundColor) styles.push(`background-color: ${fmt.backgroundColor}`);
  if (fmt.fontFamily) styles.push(`font-family: '${fmt.fontFamily}', sans-serif`);
  if (fmt.fontSize) styles.push(`font-size: ${fmt.fontSize}pt`);
  return styles.join("; ");
}

function paragraphFormatToStyles(fmt: ParagraphFormatting): string {
  const styles: string[] = [];
  if (fmt.alignment && fmt.alignment !== "left") styles.push(`text-align: ${fmt.alignment}`);
  if (fmt.spacingBefore) styles.push(`margin-top: ${Math.round(fmt.spacingBefore / 20)}pt`);
  if (fmt.spacingAfter) styles.push(`margin-bottom: ${Math.round(fmt.spacingAfter / 20)}pt`);
  if (fmt.lineHeight) styles.push(`line-height: ${fmt.lineHeight.toFixed(2)}`);
  if (fmt.indentationLeft) styles.push(`margin-left: ${Math.round(fmt.indentationLeft / 1440 * 96)}px`);
  return styles.join("; ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert a .docx Buffer to HTML preserving formatting (colors, fonts, sizes, spacing, alignment).
 * Falls back to mammoth for structure if XML parsing fails.
 */
export async function docxToFormattedHtml(buffer: Buffer): Promise<string> {
  try {
    // 1. Parse the .docx zip to get document.xml
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    if (!documentXml) {
      console.warn("[DOCX-TO-HTML] No word/document.xml found, falling back to mammoth");
      return mammothFallback(buffer);
    }

    // 2. Also try to get styles.xml for style definitions
    const stylesXml = await zip.file("word/styles.xml")?.async("string");
    const styleMap = parseStylesXml(stylesXml);

    // 3. Parse the document XML
    const tree = buildTree(documentXml);
    const body = findDescendant(tree, "w:body");

    if (!body) {
      console.warn("[DOCX-TO-HTML] No w:body found, falling back to mammoth");
      return mammothFallback(buffer);
    }

    // 4. Convert paragraphs and runs to HTML
    const htmlParts: string[] = [];
    let listStack: string[] = []; // Track open list elements

    for (const child of body.children) {
      const tag = child.tag;
      const localName = tag.includes(":") ? tag.split(":").pop()! : tag;

      if (localName === "p") {
        const paragraphHtml = convertParagraph(child, styleMap);
        if (paragraphHtml) {
          htmlParts.push(paragraphHtml);
        }
      } else if (localName === "tbl") {
        const tableHtml = convertTable(child, styleMap);
        if (tableHtml) {
          htmlParts.push(tableHtml);
        }
      }
    }

    const html = htmlParts.join("\n");

    // If our converter produced minimal output, mix with mammoth
    if (html.trim().length < 20) {
      console.warn("[DOCX-TO-HTML] Minimal output, using mammoth as fallback");
      return mammothFallback(buffer);
    }

    return html;
  } catch (err) {
    console.error("[DOCX-TO-HTML] Conversion error:", err);
    return mammothFallback(buffer);
  }
}

async function mammothFallback(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

// ── Style map from styles.xml ──────────────────────────────────────────────

interface StyleDef {
  basedOn?: string;
  runFormatting?: RunFormatting;
  paragraphFormatting?: ParagraphFormatting;
}

function parseStylesXml(xml: string | undefined): Map<string, StyleDef> {
  const styleMap = new Map<string, StyleDef>();
  if (!xml) return styleMap;

  try {
    const tree = buildTree(xml);
    const styles = findDescendants(tree, "w:style");

    for (const style of styles) {
      const styleId = style.attrs["w:styleId"];
      if (!styleId) continue;

      const def: StyleDef = {};

      // Based on
      const basedOn = findChild(style, "w:basedOn");
      if (basedOn) def.basedOn = basedOn.attrs["w:val"];

      // Run properties
      const rPr = findChild(style, "w:rPr");
      if (rPr) def.runFormatting = extractRunFormatting(rPr);

      // Paragraph properties
      const pPr = findChild(style, "w:pPr");
      if (pPr) def.paragraphFormatting = extractParagraphFormatting(pPr);

      styleMap.set(styleId, def);
    }

    return styleMap;
  } catch {
    return styleMap;
  }
}

function resolveStyle(pPr: XElem | undefined, styleMap: Map<string, StyleDef>): { runFmt: RunFormatting; paraFmt: ParagraphFormatting } {
  let runFmt: RunFormatting = {};
  let paraFmt: ParagraphFormatting = {};

  if (pPr) {
    const pStyle = findChild(pPr, "w:pStyle");
    if (pStyle && pStyle.attrs["w:val"]) {
      const styleId = pStyle.attrs["w:val"];
      // Resolve style chain (simplified: only one level of basedOn)
      const resolved = resolveStyleChain(styleId, styleMap);
      runFmt = { ...resolved.runFmt };
      paraFmt = { ...resolved.paraFmt };
    }

    // Direct formatting overrides style
    const directRunFmt = extractRunFormatting(findChild(pPr, "w:rPr"));
    const directParaFmt = extractParagraphFormatting(pPr);
    runFmt = { ...runFmt, ...directRunFmt };
    paraFmt = { ...paraFmt, ...directParaFmt };
  }

  return { runFmt, paraFmt };
}

function resolveStyleChain(styleId: string, styleMap: Map<string, StyleDef>): { runFmt: RunFormatting; paraFmt: ParagraphFormatting } {
  const style = styleMap.get(styleId);
  if (!style) return { runFmt: {}, paraFmt: {} };

  let runFmt: RunFormatting = {};
  let paraFmt: ParagraphFormatting = {};

  // Resolve parent first
  if (style.basedOn) {
    const parent = resolveStyleChain(style.basedOn, styleMap);
    runFmt = { ...parent.runFmt };
    paraFmt = { ...parent.paraFmt };
  }

  // Apply this style's formatting
  if (style.runFormatting) runFmt = { ...runFmt, ...style.runFormatting };
  if (style.paragraphFormatting) paraFmt = { ...paraFmt, ...style.paragraphFormatting };

  return { runFmt, paraFmt };
}

// ── Paragraph conversion ───────────────────────────────────────────────────

function convertParagraph(pElem: XElem, styleMap: Map<string, StyleDef>): string {
  const pPr = findChild(pElem, "w:pPr");
  const { paraFmt } = resolveStyle(pPr, styleMap);

  // Extract run-level default formatting from paragraph style
  const pStyleRunFmt = resolveStyle(pPr, styleMap).runFmt;

  // Collect runs
  const runs = findChildren(pElem, "w:r");
  const contentParts: string[] = [];

  for (const run of runs) {
    const rPr = findChild(run, "w:rPr");
    let runFmt = extractRunFormatting(rPr);

    // Merge with paragraph style run formatting (direct overrides style)
    const mergedFmt: RunFormatting = { ...pStyleRunFmt, ...runFmt };

    // Get text content
    const tElem = findChild(run, "w:t");
    const text = tElem?.text || "";

    if (!text) continue;

    // Build the formatted text span
    const styleStr = runFormatToStyles(mergedFmt);
    let html = escapeHtml(text);

    if (mergedFmt.bold) html = `<strong>${html}</strong>`;
    if (mergedFmt.italic) html = `<em>${html}</em>`;
    if (mergedFmt.underline) html = `<u>${html}</u>`;
    if (mergedFmt.strike) html = `<s>${html}</s>`;
    if (mergedFmt.subscript) html = `<sub>${html}</sub>`;
    if (mergedFmt.superscript) html = `<sup>${html}</sup>`;

    // Wrap in span with inline styles if any
    if (styleStr) {
      html = `<span style="${styleStr}">${html}</span>`;
    }

    contentParts.push(html);
  }

  const content = contentParts.join("");
  if (!content && !paraFmt.headingLevel) return "";

  // Handle heading levels
  if (paraFmt.headingLevel) {
    const tag = `h${paraFmt.headingLevel}`;
    const styleStr = paragraphFormatToStyles(paraFmt);
    return styleStr ? `<${tag} style="${styleStr}">${content}</${tag}>` : `<${tag}>${content}</${tag}>`;
  }

  // Handle list items
  if (paraFmt.numberingId !== undefined) {
    const styleStr = paragraphFormatToStyles(paraFmt);
    const listStyle = paraFmt.bulletLevel && paraFmt.bulletLevel > 0 ? `margin-left: ${paraFmt.bulletLevel * 20}px;` : "";
    const fullStyle = [styleStr, listStyle].filter(Boolean).join(" ");
    return `<li style="${fullStyle || "margin-left: 20px;"}">${content}</li>`;
  }

  // Regular paragraph
  const styleStr = paragraphFormatToStyles(paraFmt);
  return styleStr ? `<p style="${styleStr}">${content}</p>` : `<p>${content}</p>`;
}

// ── Table conversion ───────────────────────────────────────────────────────

function convertTable(tblElem: XElem, styleMap: Map<string, StyleDef>): string {
  const rows = findChildren(tblElem, "w:tr");
  const rowHtmlParts: string[] = [];

  for (const row of rows) {
    const cells = findChildren(row, "w:tc");
    const cellHtmlParts: string[] = [];

    for (const cell of cells) {
      const cellContent = findChildren(cell, "w:p")
        .map((p) => convertParagraph(p, styleMap))
        .filter(Boolean)
        .join("");

      // Extract cell formatting
      const tcPr = findChild(cell, "w:tcPr");
      let cellStyle = "";
      if (tcPr) {
        const shading = findChild(tcPr, "w:shd");
        if (shading && shading.attrs["w:fill"] && shading.attrs["w:fill"] !== "auto") {
          cellStyle += `background-color: #${shading.attrs["w:fill"]};`;
        }
        const width = findChild(tcPr, "w:tcW");
        if (width && width.attrs["w:w"]) {
          const wVal = parseInt(width.attrs["w:w"]);
          const wType = width.attrs["w:type"] || "dxa";
          if (wType === "dxa") {
            cellStyle += `width: ${Math.round(wVal / 20)}pt;`;
          } else if (wType === "pct") {
            cellStyle += `width: ${wVal / 50}%;`;
          }
        }
      }

      cellHtmlParts.push(
        `<td style="border: 1px solid #d1d5db; padding: 6px 8px;${cellStyle ? " " + cellStyle : ""}">${cellContent}</td>`
      );
    }

    rowHtmlParts.push(`<tr>${cellHtmlParts.join("")}</tr>`);
  }

  return `<table style="border-collapse: collapse; width: 100%; border: 1px solid #d1d5db;">${rowHtmlParts.join("")}</table>`;
}

// ── Utility ────────────────────────────────────────────────────────────────

function findDescendant(root: XElem, tagName: string): XElem | undefined {
  for (const child of root.children) {
    if (child.tag === tagName || child.tag.endsWith(`:${tagName.split(":").pop()}`)) {
      return child;
    }
    const found = findDescendant(child, tagName);
    if (found) return found;
  }
  return undefined;
}

function findDescendants(root: XElem, tagName: string): XElem[] {
  const results: XElem[] = [];
  for (const child of root.children) {
    if (child.tag === tagName || child.tag.endsWith(`:${tagName.split(":").pop()}`)) {
      results.push(child);
    }
    results.push(...findDescendants(child, tagName));
  }
  return results;
}
