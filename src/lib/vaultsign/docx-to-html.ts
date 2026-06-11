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
  return buildTree(xmlStr);
}

function buildTree(xml: string): XElem {
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
      // Enhanced attribute parser - handles namespaced attributes
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
  indentationFirstLine?: number; // in twips
  bulletLevel?: number;
  numberingId?: string;
  headingLevel?: number;
  isPageBreak?: boolean;
  isSectionBreak?: boolean;
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
        fmt.lineHeight = lineVal / 240;
      }
    }
  }

  // Indentation
  const ind = findChild(pPr, "w:ind");
  if (ind) {
    if (ind.attrs["w:left"]) fmt.indentationLeft = parseInt(ind.attrs["w:left"]);
    if (ind.attrs["w:right"]) fmt.indentationRight = parseInt(ind.attrs["w:right"]);
    if (ind.attrs["w:firstLine"]) fmt.indentationFirstLine = parseInt(ind.attrs["w:firstLine"]);
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
    // Numeric style IDs that map to headings (common in Word)
    // These will be resolved via styles.xml if available
  }

  // Page break before
  const pageBreakBefore = findChild(pPr, "w:pageBreakBefore");
  if (pageBreakBefore) {
    fmt.isPageBreak = true;
  }

  // Section properties within paragraph (sectPr)
  const sectPr = findChild(pPr, "w:sectPr");
  if (sectPr) {
    fmt.isSectionBreak = true;
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
  if (fmt.indentationRight) styles.push(`margin-right: ${Math.round(fmt.indentationRight / 1440 * 96)}px`);
  if (fmt.indentationFirstLine) styles.push(`text-indent: ${Math.round(fmt.indentationFirstLine / 1440 * 96)}px`);
  return styles.join("; ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Numbering / List handling ──────────────────────────────────────────────

interface NumberingDef {
  isOrdered: boolean;
  levels: Map<number, { numFmt?: string; lvlText?: string; start?: number }>;
}

function parseNumberingXml(xml: string | undefined): Map<string, NumberingDef> {
  const numMap = new Map<string, NumberingDef>();
  if (!xml) return numMap;

  try {
    const tree = buildTree(xml);

    // Parse abstract numbering definitions first
    const abstractNums = findDescendants(tree, "w:abstractNum");
    const abstractDefs = new Map<string, NumberingDef>();

    for (const absNum of abstractNums) {
      const absId = absNum.attrs["w:abstractNumId"];
      if (!absId) continue;

      const def: NumberingDef = { isOrdered: false, levels: new Map() };

      // Parse levels
      const levels = findChildren(absNum, "w:lvl");
      for (const lvl of levels) {
        const ilvl = lvl.attrs["w:ilvl"];
        if (ilvl === undefined) continue;
        const levelNum = parseInt(ilvl);

        const numFmtElem = findChild(lvl, "w:numFmt");
        const lvlTextElem = findChild(lvl, "w:lvlText");
        const startElem = findChild(lvl, "w:start");

        const levelInfo: { numFmt?: string; lvlText?: string; start?: number } = {};
        if (numFmtElem) levelInfo.numFmt = numFmtElem.attrs["w:val"];
        if (lvlTextElem) levelInfo.lvlText = lvlTextElem.attrs["w:val"];
        if (startElem) levelInfo.start = parseInt(startElem.attrs["w:val"] || "1");

        def.levels.set(levelNum, levelInfo);

        // Determine if this is an ordered list based on numFmt
        if (levelNum === 0) {
          const fmt = levelInfo.numFmt || "bullet";
          def.isOrdered = !["bullet", "none"].includes(fmt);
        }
      }

      abstractDefs.set(absId, def);
    }

    // Map concrete numbering IDs to abstract definitions
    const nums = findDescendants(tree, "w:num");
    for (const num of nums) {
      const numId = num.attrs["w:numId"];
      if (!numId) continue;

      const abstractRef = findChild(num, "w:abstractNumId");
      if (abstractRef && abstractRef.attrs["w:val"]) {
        const absDef = abstractDefs.get(abstractRef.attrs["w:val"]);
        if (absDef) {
          numMap.set(numId, absDef);
        }
      }
    }

    return numMap;
  } catch {
    return numMap;
  }
}

// ── Main converter ─────────────────────────────────────────────────────────

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

    // 2. Get styles.xml for style definitions
    const stylesXml = await zip.file("word/styles.xml")?.async("string");
    const styleMap = parseStylesXml(stylesXml);

    // 3. Get numbering.xml for list type definitions
    const numberingXml = await zip.file("word/numbering.xml")?.async("string");
    const numberingMap = parseNumberingXml(numberingXml);

    // 4. Parse the document XML
    const tree = buildTree(documentXml);
    const body = findDescendant(tree, "w:body");

    if (!body) {
      console.warn("[DOCX-TO-HTML] No w:body found, falling back to mammoth");
      return mammothFallback(buffer);
    }

    // 5. Convert paragraphs and runs to HTML
    // First pass: collect all body children and process them
    const rawElements: Array<{ type: "paragraph" | "table" | "break"; html: string; paraFmt?: ParagraphFormatting }> = [];

    for (const child of body.children) {
      const tag = child.tag;
      const localName = tag.includes(":") ? tag.split(":").pop()! : tag;

      if (localName === "p") {
        const { html, paraFmt } = convertParagraph(child, styleMap);
        if (paraFmt?.isPageBreak || paraFmt?.isSectionBreak) {
          rawElements.push({ type: "break", html: '<hr style="page-break-after: always; border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />' });
        }
        if (html) {
          rawElements.push({ type: "paragraph", html, paraFmt });
        }
      } else if (localName === "tbl") {
        const tableHtml = convertTable(child, styleMap);
        if (tableHtml) {
          rawElements.push({ type: "table", html: tableHtml });
        }
      }
    }

    // Second pass: wrap consecutive list items in <ul> or <ol> tags
    const htmlParts: string[] = [];
    let listStack: Array<{ tag: string; numberingId: string; level: number }> = [];

    for (let i = 0; i < rawElements.length; i++) {
      const elem = rawElements[i];

      if (elem.type === "break") {
        // Close any open lists
        while (listStack.length > 0) {
          const closed = listStack.pop()!;
          htmlParts.push(`</${closed.tag}>`);
        }
        htmlParts.push(elem.html);
        continue;
      }

      if (elem.type === "paragraph" && elem.paraFmt?.numberingId !== undefined) {
        const numberingId = elem.paraFmt.numberingId;
        const level = elem.paraFmt.bulletLevel || 0;
        const numDef = numberingMap.get(numberingId);
        const isOrdered = numDef?.isOrdered ?? false;
        const listTag = isOrdered ? "ol" : "ul";

        // Check if we need to open, close, or continue a list
        if (listStack.length === 0) {
          // Start a new list
          htmlParts.push(`<${listTag} style="margin-left: ${level * 20}px; padding-left: 20px;">`);
          listStack.push({ tag: listTag, numberingId, level });
        } else {
          const currentList = listStack[listStack.length - 1];

          // Different numbering ID = close current list and start new one
          if (currentList.numberingId !== numberingId) {
            while (listStack.length > 0) {
              const closed = listStack.pop()!;
              htmlParts.push(`</${closed.tag}>`);
            }
            htmlParts.push(`<${listTag} style="margin-left: ${level * 20}px; padding-left: 20px;">`);
            listStack.push({ tag: listTag, numberingId, level });
          }
          // Different level (nested list)
          else if (level > currentList.level) {
            htmlParts.push(`<${listTag} style="margin-left: ${(level - currentList.level - 1) * 20}px; padding-left: 20px;">`);
            listStack.push({ tag: listTag, numberingId, level });
          } else if (level < currentList.level) {
            // Close nested lists until we match the level
            while (listStack.length > 1 && listStack[listStack.length - 1].level > level) {
              const closed = listStack.pop()!;
              htmlParts.push(`</${closed.tag}>`);
            }
          }
          // Same level, same numbering = just add the item (no list tag change needed)
        }

        // Add the list item
        htmlParts.push(elem.html);
      } else {
        // Non-list element: close any open lists first
        while (listStack.length > 0) {
          const closed = listStack.pop()!;
          htmlParts.push(`</${closed.tag}>`);
        }

        if (elem.html) {
          htmlParts.push(elem.html);
        }
      }
    }

    // Close any remaining open lists
    while (listStack.length > 0) {
      const closed = listStack.pop()!;
      htmlParts.push(`</${closed.tag}>`);
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
  styleId?: string;
  name?: string;
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

      const def: StyleDef = { styleId };

      // Style name
      const nameElem = findChild(style, "w:name");
      if (nameElem) def.name = nameElem.attrs["w:val"];

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

    // Build a secondary index by name for lookup
    // Many Word documents use style names like "heading 1" instead of "Heading1"
    const byName = new Map<string, string>();
    for (const [id, def] of styleMap) {
      if (def.name) {
        byName.set(def.name.toLowerCase(), id);
        // Also map common heading names
        if (def.name.toLowerCase().startsWith("heading")) {
          byName.set(def.name.toLowerCase().replace(/\s+/g, ""), id);
        }
      }
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
      // Resolve style chain (handles basedOn inheritance)
      const resolved = resolveStyleChain(styleId, styleMap);
      runFmt = { ...resolved.runFmt };
      paraFmt = { ...resolved.paraFmt };

      // If the style has a name that indicates a heading but no headingLevel was set,
      // try to infer it from the style name
      if (!paraFmt.headingLevel) {
        const styleDef = styleMap.get(styleId);
        if (styleDef?.name) {
          const nameLower = styleDef.name.toLowerCase().replace(/\s+/g, "");
          // Match "heading1", "heading2", etc.
          const headingMatch = nameLower.match(/^heading(\d)$/);
          if (headingMatch) {
            paraFmt.headingLevel = parseInt(headingMatch[1]);
          }
          // Also check for common heading style names
          if (nameLower === "title") paraFmt.headingLevel = 1;
          if (nameLower === "subtitle") paraFmt.headingLevel = 2;
        }
      }
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

function convertParagraph(pElem: XElem, styleMap: Map<string, StyleDef>): { html: string; paraFmt: ParagraphFormatting } {
  const pPr = findChild(pElem, "w:pPr");
  const { runFmt: pStyleRunFmt, paraFmt } = resolveStyle(pPr, styleMap);

  // Check for page break within runs (w:br type="page")
  let hasPageBreak = paraFmt.isPageBreak || paraFmt.isSectionBreak;

  // Collect runs and special elements
  const contentParts: string[] = [];

  for (const child of pElem.children) {
    const localName = child.tag.includes(":") ? child.tag.split(":").pop()! : child.tag;

    if (localName === "r") {
      // Regular run
      const rPr = findChild(child, "w:rPr");

      // Check for page break in run
      const br = findChild(child, "w:br");
      if (br && br.attrs["w:type"] === "page") {
        hasPageBreak = true;
      }

      let runFmt = extractRunFormatting(rPr);

      // Merge with paragraph style run formatting (direct overrides style)
      const mergedFmt: RunFormatting = { ...pStyleRunFmt, ...runFmt };

      // Get text content - handle w:t and w:br and w:tab
      const textParts: string[] = [];
      for (const runChild of child.children) {
        const rcLocal = runChild.tag.includes(":") ? runChild.tag.split(":").pop()! : runChild.tag;

        if (rcLocal === "t") {
          const text = runChild.text || "";
          if (text) textParts.push(text);
        } else if (rcLocal === "br") {
          if (runChild.attrs["w:type"] === "page") {
            hasPageBreak = true;
          } else {
            textParts.push("<br>");
          }
        } else if (rcLocal === "tab") {
          textParts.push("&nbsp;&nbsp;&nbsp;&nbsp;");
        } else if (rcLocal === "cr") {
          textParts.push("<br>");
        } else if (rcLocal === "sym") {
          // Symbol character - skip for now
        }
      }

      const text = textParts.join("");
      if (!text && textParts.length === 0) continue;

      // Build the formatted text span
      const styleStr = runFormatToStyles(mergedFmt);
      let html = text;

      // Only wrap in strong/em/u/s tags if there's actual text content (not just <br>)
      const hasTextContent = html.replace(/<br>/g, "").trim().length > 0;
      if (hasTextContent) {
        if (mergedFmt.bold) html = `<strong>${html}</strong>`;
        if (mergedFmt.italic) html = `<em>${html}</em>`;
        if (mergedFmt.underline) html = `<u>${html}</u>`;
        if (mergedFmt.strike) html = `<s>${html}</s>`;
        if (mergedFmt.subscript) html = `<sub>${html}</sub>`;
        if (mergedFmt.superscript) html = `<sup>${html}</sup>`;
      }

      // Wrap in span with inline styles if any
      if (styleStr && hasTextContent) {
        html = `<span style="${styleStr}">${html}</span>`;
      }

      contentParts.push(html);
    } else if (localName === "hyperlink") {
      // Handle hyperlinks
      const linkRuns = findChildren(child, "w:r");
      const linkTextParts: string[] = [];

      for (const run of linkRuns) {
        const tElem = findChild(run, "w:t");
        const text = tElem?.text || "";
        if (!text) continue;

        const rPr = findChild(run, "w:rPr");
        let runFmt = extractRunFormatting(rPr);
        const mergedFmt: RunFormatting = { ...pStyleRunFmt, ...runFmt };

        const styleStr = runFormatToStyles(mergedFmt);
        let html = escapeHtml(text);

        if (mergedFmt.bold) html = `<strong>${html}</strong>`;
        if (mergedFmt.italic) html = `<em>${html}</em>`;
        if (mergedFmt.underline) html = `<u>${html}</u>`;
        if (styleStr) html = `<span style="${styleStr}">${html}</span>`;

        linkTextParts.push(html);
      }

      const linkContent = linkTextParts.join("");
      if (linkContent) {
        contentParts.push(`<a href="#" style="color: #2563EB; text-decoration: underline;">${linkContent}</a>`);
      }
    } else if (localName === "bookmarkStart" || localName === "bookmarkEnd") {
      // Skip bookmarks
    }
  }

  const content = contentParts.join("");

  // Update paraFmt with page break info
  if (hasPageBreak) {
    paraFmt.isPageBreak = true;
  }

  // For list items, only output <li> - the wrapping <ul>/<ol> is handled in the main loop
  if (paraFmt.numberingId !== undefined) {
    const styleStr = paragraphFormatToStyles(paraFmt);
    const listStyle = paraFmt.bulletLevel && paraFmt.bulletLevel > 0
      ? `margin-left: ${paraFmt.bulletLevel * 20}px;`
      : "";
    const fullStyle = [styleStr, listStyle].filter(Boolean).join(" ");

    if (content) {
      return { html: `<li style="${fullStyle || "margin-left: 20px;"}">${content}</li>`, paraFmt };
    } else {
      // Empty list item - still output to maintain list structure
      return { html: `<li style="${fullStyle || "margin-left: 20px;"}">&nbsp;</li>`, paraFmt };
    }
  }

  // Empty paragraph (but not empty list item)
  if (!content && !paraFmt.headingLevel) {
    // Check if this is an empty paragraph with spacing (should be preserved as blank line)
    if (paraFmt.spacingAfter || paraFmt.spacingBefore) {
      const styleStr = paragraphFormatToStyles(paraFmt);
      return { html: styleStr ? `<p style="${styleStr}">&nbsp;</p>` : `<p>&nbsp;</p>`, paraFmt };
    }
    return { html: "", paraFmt };
  }

  // Handle heading levels
  if (paraFmt.headingLevel) {
    const tag = `h${paraFmt.headingLevel}`;
    const styleStr = paragraphFormatToStyles(paraFmt);
    const headingContent = content || "&nbsp;";
    return { html: styleStr ? `<${tag} style="${styleStr}">${headingContent}</${tag}>` : `<${tag}>${headingContent}</${tag}>`, paraFmt };
  }

  // Regular paragraph
  const styleStr = paragraphFormatToStyles(paraFmt);
  return { html: styleStr ? `<p style="${styleStr}">${content || "&nbsp;"}</p>` : `<p>${content || "&nbsp;"}</p>`, paraFmt };
}

// ── Table conversion ───────────────────────────────────────────────────────

function convertTable(tblElem: XElem, styleMap: Map<string, StyleDef>): string {
  const rows = findChildren(tblElem, "w:tr");
  const rowHtmlParts: string[] = [];

  // Parse table grid (column widths)
  const tblGrid = findChild(tblElem, "w:tblGrid");
  const colWidths: number[] = [];
  if (tblGrid) {
    const gridCols = findChildren(tblGrid, "w:gridCol");
    for (const col of gridCols) {
      if (col.attrs["w:w"]) {
        colWidths.push(parseInt(col.attrs["w:w"]));
      }
    }
  }

  // Track vertical merges per column
  const vMergeState: Map<number, { isContinuation: boolean; rowSpan: number; content: string; style: string }> = new Map();

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const cells = findChildren(row, "w:tc");
    const cellHtmlParts: string[] = [];
    let colIdx = 0;

    for (const cell of cells) {
      // Skip cells that are continuation of vertical merge
      const tcPr = findChild(cell, "w:tcPr");

      // Handle horizontal merge (gridSpan)
      let gridSpan = 1;
      if (tcPr) {
        const gs = findChild(tcPr, "w:gridSpan");
        if (gs && gs.attrs["w:val"]) {
          gridSpan = parseInt(gs.attrs["w:val"]);
        }
      }

      // Handle vertical merge (vMerge)
      let isVMergeContinuation = false;
      let isVMergeStart = false;
      if (tcPr) {
        const vMerge = findChild(tcPr, "w:vMerge");
        if (vMerge) {
          if (vMerge.attrs["w:val"] === "restart" || vMerge.attrs["w:val"] === "1") {
            isVMergeStart = true;
          } else {
            isVMergeContinuation = true;
          }
        }
      }

      if (isVMergeContinuation) {
        // This cell is a continuation of a vertical merge - skip it in output
        // but update the rowSpan of the originating cell
        const mergeInfo = vMergeState.get(colIdx);
        if (mergeInfo) {
          mergeInfo.rowSpan++;
        }
        colIdx += gridSpan;
        continue;
      }

      const cellContent = findChildren(cell, "w:p")
        .map((p) => convertParagraph(p, styleMap).html)
        .filter(Boolean)
        .join("");

      // Extract cell formatting
      let cellStyle = "";
      let cellAttrs = "";

      if (tcPr) {
        // Shading / background
        const shading = findChild(tcPr, "w:shd");
        if (shading && shading.attrs["w:fill"] && shading.attrs["w:fill"] !== "auto" && shading.attrs["w:fill"] !== "FFFFFF") {
          cellStyle += `background-color: #${shading.attrs["w:fill"]};`;
        }

        // Width
        const width = findChild(tcPr, "w:tcW");
        if (width && width.attrs["w:w"]) {
          const wVal = parseInt(width.attrs["w:w"]);
          const wType = width.attrs["w:type"] || "dxa";
          if (wType === "dxa" && wVal > 0) {
            cellStyle += `width: ${Math.round(wVal / 20)}pt;`;
          } else if (wType === "pct" && wVal > 0) {
            cellStyle += `width: ${wVal / 50}%;`;
          }
        }

        // Vertical alignment
        const vAlign = findChild(tcPr, "w:vAlign");
        if (vAlign && vAlign.attrs["w:val"]) {
          const val = vAlign.attrs["w:val"];
          if (val === "center") cellStyle += "vertical-align: middle;";
          else if (val === "bottom") cellStyle += "vertical-align: bottom;";
          else cellStyle += "vertical-align: top;";
        }

        // Borders
        const tcBorders = findChild(tcPr, "w:tcBorders");
        if (tcBorders) {
          // Just use default borders - individual cell borders are complex
        }

        // GridSpan
        if (gridSpan > 1) {
          cellAttrs += ` colspan="${gridSpan}"`;
        }
      }

      // Handle vMerge start
      if (isVMergeStart) {
        vMergeState.set(colIdx, { isContinuation: false, rowSpan: 1, content: cellContent, style: cellStyle });
      }

      // Check if there's a pending vMerge that needs rowSpan
      const mergeInfo = vMergeState.get(colIdx);
      if (isVMergeStart && mergeInfo && mergeInfo.rowSpan > 1) {
        cellAttrs += ` rowspan="${mergeInfo.rowSpan}"`;
      }

      // Determine if this is a header cell (first row or has header style)
      const isFirstRow = rowIdx === 0;
      const isHeaderCell = isFirstRow && !cellContent.includes("</p>"); // Simple heuristic

      const tag = isFirstRow ? "th" : "td";
      const headerStyle = isFirstRow ? "font-weight: 600; background-color: #f9fafb;" : "";

      cellHtmlParts.push(
        `<${tag} style="border: 1px solid #d1d5db; padding: 6px 8px;${headerStyle ? " " + headerStyle : ""}${cellStyle ? " " + cellStyle : ""}"${cellAttrs}>${cellContent || "&nbsp;"}</${tag}>`
      );

      colIdx += gridSpan;
    }

    rowHtmlParts.push(`<tr>${cellHtmlParts.join("")}</tr>`);
  }

  return `<table style="border-collapse: collapse; width: 100%; border: 1px solid #d1d5db; margin: 12px 0;">${rowHtmlParts.join("")}</table>`;
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
