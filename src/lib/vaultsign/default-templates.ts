/**
 * Default document templates for VaultSign.
 *
 * When a recruiter creates a new document of a specific type (e.g.,
 * right_to_represent, offer_letter), and doesn't provide content or
 * use a template, we auto-populate with a standard template.
 *
 * Templates use TipTap JSON format and include placeholder variables
 * that auto-fill from candidate/agency/job data.
 */

export interface DefaultTemplate {
  /** TipTap JSON content */
  tiptap_content: string;
  /** Sign fields to auto-add */
  sign_fields: Array<{
    type: "signature" | "date" | "full_name" | "initials" | "email" | "text" | "checkbox";
    label: string;
    assigned_to_signer_index: number;
  }>;
  /** Placeholder variable keys used in the template */
  placeholder_variables: string[];
}

/**
 * Default Right to Represent (RTR) template.
 *
 * Variables (auto-filled if available):
 *   - candidate_name: Full name of the candidate
 *   - agency_name: Agency/recruiter organization name
 *   - agency_address: Agency address
 *   - agency_phone: Agency phone
 *   - agency_email: Agency email
 *   - position_title: Job title
 *   - facility_name: Client facility name
 *   - location: City, State
 *   - specialty: Nursing specialty
 *   - start_date: Contract start date
 *   - duration: Contract duration (e.g., "13 weeks")
 *   - pay_rate: Pay rate (e.g., "$2,500/week")
 *   - current_date: Today's date
 */
export function getRtrTemplate(): DefaultTemplate {
  const tiptapContent = {
    type: "doc",
    content: [
      // Title
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          { type: "text", text: "RIGHT TO REPRESENT", marks: [{ type: "bold" }] },
        ],
      },
      // Empty line
      { type: "paragraph", content: [] },

      // Date
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Date: " },
          { type: "text", text: "{{current_date}}", marks: [{ type: "bold" }] },
        ],
      },
      { type: "paragraph", content: [] },

      // Parties
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This Right to Represent (\"RTR\") is entered into between:" },
        ],
      },
      { type: "paragraph", content: [] },

      // Agency info
      {
        type: "paragraph",
        content: [
          { type: "text", text: "{{agency_name}}", marks: [{ type: "bold" }] },
          { type: "hardBreak" },
          { type: "text", text: "{{agency_address}}" },
          { type: "hardBreak" },
          { type: "text", text: "{{agency_phone}}" },
          { type: "text", text: " · " },
          { type: "text", text: "{{agency_email}}" },
        ],
      },
      { type: "paragraph", content: [] },

      // "and"
      { type: "paragraph", content: [{ type: "text", text: "and" }] },
      { type: "paragraph", content: [] },

      // Candidate info
      {
        type: "paragraph",
        content: [
          { type: "text", text: "{{candidate_name}}", marks: [{ type: "bold" }] },
          { type: "text", text: " (\"Candidate\")" },
        ],
      },
      { type: "paragraph", content: [] },

      // Representation
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Agency hereby represents Candidate for the following healthcare position:" },
        ],
      },
      { type: "paragraph", content: [] },

      // Position details
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Position: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{position_title}}" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Facility: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{facility_name}}" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Location: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{location}}" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Specialty: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{specialty}}" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Start Date: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{start_date}}" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Duration: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{duration}}" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Pay Rate: ", marks: [{ type: "bold" }] },
          { type: "text", text: "{{pay_rate}}" },
        ],
      },
      { type: "paragraph", content: [] },

      // Terms
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "By signing below, Candidate acknowledges that Agency has the exclusive right to represent them for the above-mentioned position for a period of 90 days from the date of this agreement. Candidate confirms that they have not been previously submitted to this facility by another agency and that the information provided is accurate.",
          },
        ],
      },
      { type: "paragraph", content: [] },

      // Signature area
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Candidate Signature:", marks: [{ type: "bold" }] },
        ],
      },
      // Sign field placeholder — the actual signField node is inserted by the client
      {
        type: "paragraph",
        content: [
          { type: "text", text: "_________________________________" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "{{candidate_name}}" },
        ],
      },
      { type: "paragraph", content: [] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Date:", marks: [{ type: "bold" }] },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "_________________________________" },
        ],
      },
    ],
  };

  return {
    tiptap_content: JSON.stringify(tiptapContent),
    sign_fields: [
      {
        type: "signature",
        label: "Signature",
        assigned_to_signer_index: 0,
      },
      {
        type: "date",
        label: "Date",
        assigned_to_signer_index: 0,
      },
    ],
    placeholder_variables: [
      "candidate_name",
      "agency_name",
      "agency_address",
      "agency_phone",
      "agency_email",
      "position_title",
      "facility_name",
      "location",
      "specialty",
      "start_date",
      "duration",
      "pay_rate",
      "current_date",
    ],
  };
}

/**
 * Get a default template for a document type.
 * Returns null if no template exists for the type.
 */
export function getDefaultTemplate(documentType: string): DefaultTemplate | null {
  switch (documentType) {
    case "right_to_represent":
    case "rtr":
      return getRtrTemplate();
    default:
      return null;
  }
}

/**
 * Get default placeholder values for a template.
 * Fills in today's date and any other auto-calculated values.
 */
export function getDefaultPlaceholderValues(
  template: DefaultTemplate,
  context?: {
    candidateName?: string;
    agencyName?: string;
    agencyAddress?: string;
    agencyPhone?: string;
    agencyEmail?: string;
  }
): Record<string, string> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const values: Record<string, string> = {
    current_date: today,
  };

  if (context?.candidateName) values.candidate_name = context.candidateName;
  if (context?.agencyName) values.agency_name = context.agencyName;
  if (context?.agencyAddress) values.agency_address = context.agencyAddress;
  if (context?.agencyPhone) values.agency_phone = context.agencyPhone;
  if (context?.agencyEmail) values.agency_email = context.agencyEmail;

  return values;
}
