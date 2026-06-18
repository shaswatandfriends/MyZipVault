/**
 * Lightweight HTML sanitizer for user-generated HTML content.
 *
 * Prevents XSS attacks by stripping dangerous HTML elements and attributes
 * while preserving safe formatting (paragraphs, headings, links, images, etc.)
 *
 * Used for:
 * - Email campaign bodies (super admin creates HTML emails)
 * - BAA content (super admin pastes legal text)
 * - Any other user-generated HTML that gets rendered or sent via email
 *
 * This is a server-side sanitizer (no DOM required) — works in Next.js
 * API routes and server components.
 */

// Tags that are completely stripped (content removed too)
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "applet",
  "base",
  "meta",
  "link",
  "style",
];

// Attributes that can execute JavaScript
const DANGEROUS_ATTRS = [
  "onclick",
  "onload",
  "onerror",
  "onmouseover",
  "onmouseout",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
  "onreset",
  "onkeydown",
  "onkeyup",
  "onkeypress",
  "ontoggle",
  "onanimationstart",
  "onanimationend",
  "onanimationiteration",
  "ontransitionend",
  "onscroll",
  "onresize",
  "oncontextmenu",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "onwheel",
  "oncopy",
  "oncut",
  "onpaste",
];

// URL schemes that are safe
const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:", "/"];

/**
 * Sanitize HTML content to prevent XSS attacks.
 *
 * What it does:
 * 1. Strips dangerous tags entirely (script, iframe, form, etc.)
 * 2. Strips dangerous event handler attributes (onclick, onload, etc.)
 * 3. Strips javascript: URLs from href and src attributes
 * 4. Strips data: URLs from src attributes (except images)
 * 5. Preserves safe HTML (p, h1-h6, a, img, table, ul, ol, li, etc.)
 *
 * @param html - Raw HTML string from user input
 * @returns Sanitized HTML string safe for rendering/emailing
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let sanitized = html;

  // 1. Strip dangerous tags entirely (including content)
  for (const tag of DANGEROUS_TAGS) {
    // Remove opening tag, content, and closing tag
    const openRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    sanitized = sanitized.replace(openRegex, "");
    // Remove self-closing versions
    const selfCloseRegex = new RegExp(`<${tag}[^>]*/?>`, "gi");
    sanitized = sanitized.replace(selfCloseRegex, "");
  }

  // 2. Strip dangerous event handler attributes
  for (const attr of DANGEROUS_ATTRS) {
    // Match: attrname="value" or attrname='value' or attrname=value
    const attrRegex = new RegExp(`\\s${attr}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "gi");
    sanitized = sanitized.replace(attrRegex, "");
  }

  // 3. Sanitize href attributes — strip javascript: URLs
  sanitized = sanitized.replace(
    /href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match, url) => {
      const cleanUrl = url.replace(/["']/g, "").trim();
      if (isSafeUrl(cleanUrl)) {
        return `href="${cleanUrl}"`;
      }
      return ""; // Remove the href entirely
    }
  );

  // 4. Sanitize src attributes — strip javascript: and data: URLs
  // (except data:image/ which is safe for inline images)
  sanitized = sanitized.replace(
    /src\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match, url) => {
      const cleanUrl = url.replace(/["']/g, "").trim();
      if (isSafeUrl(cleanUrl) || cleanUrl.startsWith("data:image/")) {
        return `src="${cleanUrl}"`;
      }
      return ""; // Remove the src entirely
    }
  );

  // 5. Strip any remaining on* attributes that we might have missed
  sanitized = sanitized.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 6. Strip style attributes that contain expressions or javascript
  sanitized = sanitized.replace(
    /style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match, style) => {
      const cleanStyle = style.replace(/["']/g, "").toLowerCase();
      if (cleanStyle.includes("expression(") || cleanStyle.includes("javascript:")) {
        return ""; // Remove dangerous style
      }
      return match; // Keep safe style
    }
  );

  return sanitized;
}

/**
 * Check if a URL is safe (not javascript:, vbscript:, etc.)
 */
function isSafeUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase().trim();

  // Relative URLs are safe
  if (lowerUrl.startsWith("/") || lowerUrl.startsWith("#")) {
    return true;
  }

  // Check against safe schemes
  return SAFE_URL_SCHEMES.some((scheme) => lowerUrl.startsWith(scheme));
}

/**
 * Sanitize plain text — escapes HTML entities to prevent XSS when
 * rendering user input as text (not HTML).
 *
 * Use this when displaying user input in a context where it shouldn't
 * be interpreted as HTML (e.g., in a <textarea> or as button label).
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
