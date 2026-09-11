import type { Resume as PrismaResume } from "@prisma/client";

/**
 * Resume Renderer — takes a Resume + ResumeTemplate config → outputs HTML.
 *
 * Phase 5.4 of EXECUTION-PLAN.
 *
 * Currently supports rendering resumes that have `parsed_data` JSON
 * (builder resumes + parsed-from-PDF resumes). For uploaded PDFs with no
 * parsed_data, the caller should fall back to embedding the original PDF.
 *
 * Future: extend this to also produce PDF output via pdfmake.
 */

export interface ResumeLayoutConfig {
  font_family?: string;
  font_size?: number;
  heading_color?: string;
  accent_color?: string;
  section_order?: string[]; // e.g., ["contact", "summary", "experience", ...]
  spacing?: "tight" | "normal" | "comfortable";
  page_margins?: string;
  max_pages?: number;
}

export interface ResumeParsedData {
  // Standardized shape (matches what Affinda + the builder produce)
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    location?: string;
    graduation_date?: string;
  }>;
  skills?: string[];
  certifications?: Array<{ name?: string; issuer?: string; year?: string }>;
  licenses?: Array<{ name?: string; number?: string; state?: string }>;
}

/**
 * Renders a parsed resume to HTML using the template's layout config.
 *
 * @param parsedData  The parsed resume content (from Resume.parsed_data)
 * @param layoutConfig  The template's layout_config (from ResumeTemplate)
 * @returns  HTML string suitable for embedding in a page or PDF
 */
export function renderResumeToHtml(
  parsedData: ResumeParsedData | string | null,
  layoutConfig: ResumeLayoutConfig | null
): string {
  if (!parsedData) {
    return '<p style="color:#888;font-style:italic;">No resume data to display.</p>';
  }

  // parsedData may be a JSON string or already-parsed object
  const data: ResumeParsedData = typeof parsedData === "string" ? JSON.parse(parsedData) : parsedData;

  const cfg = layoutConfig || {};
  const fontFamily = cfg.font_family || "Inter, sans-serif";
  const fontSize = cfg.font_size || 11;
  const headingColor = cfg.heading_color || "#0b3d91";
  const accentColor = cfg.accent_color || "#64748b";
  const spacing = cfg.spacing === "tight" ? "8px" : cfg.spacing === "comfortable" ? "20px" : "12px";
  const margins = cfg.page_margins || "0.75in";

  // Section renderer dispatch table
  const sectionRenderers: Record<string, () => string> = {
    contact: () => renderContact(data, headingColor),
    summary: () => renderSummary(data.summary, headingColor),
    experience: () => renderExperience(data.experience, headingColor),
    education: () => renderEducation(data.education, headingColor),
    skills: () => renderSkills(data.skills, headingColor),
    certifications: () => renderCertifications(data.certifications, headingColor),
    licenses: () => renderLicenses(data.licenses, headingColor),
    executive_summary: () => renderSummary(data.summary, headingColor),
    core_competencies: () => renderSkills(data.skills, headingColor),
  };

  // Render in the order specified by layout_config.section_order,
  // fall back to a sensible default order
  const order = cfg.section_order && cfg.section_order.length > 0
    ? cfg.section_order
    : ["contact", "summary", "experience", "education", "skills", "certifications", "licenses"];

  const sectionsHtml = order
    .map((section) => {
      const renderer = sectionRenderers[section];
      return renderer ? renderer() : "";
    })
    .filter((html) => html.trim().length > 0)
    .join(`<div style="margin-bottom:${spacing}"></div>`);

  return `
    <div style="font-family:${fontFamily};font-size:${fontSize}px;color:#1a1a1a;margin:${margins};line-height:1.4;">
      ${sectionsHtml}
    </div>
  `;
}

function renderHeading(text: string, color: string): string {
  return `<h2 style="color:${color};font-size:13px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px 0;border-bottom:1px solid ${color}33;padding-bottom:3px;">${escapeHtml(text)}</h2>`;
}

function renderContact(data: ResumeParsedData, headingColor: string): string {
  const parts = [
    data.full_name,
    data.email,
    data.phone,
    data.location,
  ].filter(Boolean);
  if (parts.length === 0) return "";
  return `
    <div style="text-align:center;margin-bottom:12px;">
      ${data.full_name ? `<h1 style="font-size:18px;color:${headingColor};margin:0 0 4px 0;">${escapeHtml(data.full_name)}</h1>` : ""}
      <p style="font-size:10px;color:#666;margin:0;">${parts.slice(1).map(escapeHtml).join(" · ")}</p>
    </div>
  `;
}

function renderSummary(summary: string | undefined, headingColor: string): string {
  if (!summary) return "";
  return `
    <div>
      ${renderHeading("Summary", headingColor)}
      <p style="margin:0;">${escapeHtml(summary)}</p>
    </div>
  `;
}

function renderExperience(experience: ResumeParsedData["experience"], headingColor: string): string {
  if (!experience || experience.length === 0) return "";
  const items = experience.map((job) => `
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="font-size:${11}px;">${escapeHtml(job.title || "")}</strong>
        <span style="font-size:10px;color:#666;">${escapeHtml([job.start_date, job.end_date || "Present"].filter(Boolean).join(" — "))}</span>
      </div>
      <div style="font-size:10px;color:#666;font-style:italic;margin-bottom:2px;">
        ${escapeHtml([job.company, job.location].filter(Boolean).join(" · "))}
      </div>
      ${job.description ? `<p style="font-size:10px;margin:2px 0 0 0;">${escapeHtml(job.description)}</p>` : ""}
    </div>
  `).join("");
  return `<div>${renderHeading("Experience", headingColor)}${items}</div>`;
}

function renderEducation(education: ResumeParsedData["education"], headingColor: string): string {
  if (!education || education.length === 0) return "";
  const items = education.map((edu) => `
    <div style="margin-bottom:4px;">
      <strong style="font-size:10px;">${escapeHtml(edu.degree || "")}</strong>
      <span style="font-size:10px;color:#666;"> — ${escapeHtml([edu.institution, edu.location, edu.graduation_date].filter(Boolean).join(", "))}</span>
    </div>
  `).join("");
  return `<div>${renderHeading("Education", headingColor)}${items}</div>`;
}

function renderSkills(skills: string[] | undefined, headingColor: string): string {
  if (!skills || skills.length === 0) return "";
  return `
    <div>
      ${renderHeading("Skills", headingColor)}
      <p style="font-size:10px;margin:0;">${skills.map(escapeHtml).join(", ")}</p>
    </div>
  `;
}

function renderCertifications(certs: ResumeParsedData["certifications"], headingColor: string): string {
  if (!certs || certs.length === 0) return "";
  const items = certs.map((c) => `
    <div style="margin-bottom:2px;font-size:10px;">
      <strong>${escapeHtml(c.name || "")}</strong>
      ${c.issuer ? `<span style="color:#666;"> — ${escapeHtml(c.issuer)}</span>` : ""}
      ${c.year ? `<span style="color:#666;">, ${escapeHtml(c.year)}</span>` : ""}
    </div>
  `).join("");
  return `<div>${renderHeading("Certifications", headingColor)}${items}</div>`;
}

function renderLicenses(licenses: ResumeParsedData["licenses"], headingColor: string): string {
  if (!licenses || licenses.length === 0) return "";
  const items = licenses.map((l) => `
    <div style="margin-bottom:2px;font-size:10px;">
      <strong>${escapeHtml(l.name || "")}</strong>
      ${l.number ? `<span style="color:#666;"> #${escapeHtml(l.number)}</span>` : ""}
      ${l.state ? `<span style="color:#666;"> (${escapeHtml(l.state)})</span>` : ""}
    </div>
  `).join("");
  return `<div>${renderHeading("Licenses", headingColor)}${items}</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Type helper for callers — pull the typed Resume row from Prisma and
 * extract just what the renderer needs.
 */
export function extractResumeForRendering(resume: {
  parsed_data: string | null;
  resume_template?: { layout_config: any } | null;
}): { parsedData: ResumeParsedData | null; layoutConfig: ResumeLayoutConfig | null } {
  let parsedData: ResumeParsedData | null = null;
  if (resume.parsed_data) {
    try {
      parsedData = JSON.parse(resume.parsed_data);
    } catch {
      parsedData = null;
    }
  }
  let layoutConfig: ResumeLayoutConfig | null = null;
  if (resume.resume_template?.layout_config) {
    try {
      layoutConfig = typeof resume.resume_template.layout_config === "string"
        ? JSON.parse(resume.resume_template.layout_config)
        : resume.resume_template.layout_config;
    } catch {
      layoutConfig = null;
    }
  }
  return { parsedData, layoutConfig };
}
