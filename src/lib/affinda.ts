import { AffindaAPI, ResumeSearchBody } from "@affinda/affinda";

const AFFINDA_API_KEY = process.env.AFFINDA_API_KEY || "";

let affindaClient: AffindaAPI | null = null;

export function getAffindaClient(): AffindaAPI | null {
  if (!affindaClient) {
    if (!AFFINDA_API_KEY) {
      console.warn("[AFFINDA] API_KEY not configured. Resume parsing disabled.");
      return null;
    }
    affindaClient = new AffindaAPI({ apiKey: AFFINDA_API_KEY });
  }
  return affindaClient;
}

export function isAffindaConfigured(): boolean {
  return !!AFFINDA_API_KEY;
}

/**
 * Parse a resume file using Affinda API.
 * Returns parsed resume data as JSON string.
 */
export async function parseResume(
  fileBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  const client = getAffindaClient();
  if (!client) {
    console.log("[AFFINDA] Not configured, skipping resume parsing");
    return null;
  }

  try {
    // Create a File-like object from the buffer
    const file = new File([fileBuffer], fileName);

    const result = await client.createResume({
      file: file,
      fileName: fileName,
    });

    // Extract key data from parsed resume
    const parsedData = {
      name: result.data?.name?.raw || "",
      email: result.data?.email || "",
      phone: result.data?.phoneNumber || "",
      location: result.data?.location?.raw || "",
      summary: result.data?.summary || "",
      workExperience: result.data?.workExperience?.map((exp) => ({
        title: exp.jobTitle || "",
        organization: exp.organization || "",
        startDate: exp.dates?.startDate || "",
        endDate: exp.dates?.endDate || "",
        current: exp.dates?.isCurrentDate || false,
        description: exp.jobDescription || "",
      })) || [],
      education: result.data?.education?.map((edu) => ({
        institution: edu.organization || "",
        degree: edu.accreditation?.inputStr || "",
        startDate: edu.dates?.startDate || "",
        endDate: edu.dates?.endDate || "",
      })) || [],
      skills: result.data?.skills?.map((s) => s.name || "").filter(Boolean) || [],
      certifications: result.data?.certifications?.map((c) => c.name || "").filter(Boolean) || [],
      languages: result.data?.languages?.map((l) => l.name || "").filter(Boolean) || [],
      rawAffindaResponse: result,
    };

    return JSON.stringify(parsedData);
  } catch (error) {
    console.error("[AFFINDA] Resume parsing failed:", error);
    return null;
  }
}

/**
 * Get skill suggestions based on a list of existing skills.
 * Uses Affinda's Resume Search Suggestion API.
 * Returns an array of suggested skill names.
 */
export async function suggestSkills(existingSkills: string[]): Promise<string[]> {
  const client = getAffindaClient();
  if (!client) return [];

  try {
    const result = await client.getResumeSearchSuggestionSkill(existingSkills);
    // The result contains suggested skills
    const suggestions = result as unknown as { data?: { name: string }[]; name?: string }[];
    if (Array.isArray(suggestions)) {
      return suggestions
        .map((s) => (typeof s === "string" ? s : s.name || s.data?.name || ""))
        .filter(Boolean) as string[];
    }
    // Handle different response formats
    if (suggestions && typeof suggestions === "object") {
      const data = (suggestions as Record<string, unknown>).data;
      if (Array.isArray(data)) {
        return data
          .map((s: unknown) =>
            typeof s === "string" ? s : (s as Record<string, unknown>)?.name || ""
          )
          .filter(Boolean) as string[];
      }
    }
    return [];
  } catch (error) {
    console.error("[AFFINDA] Skill suggestion failed:", error);
    return [];
  }
}

/**
 * Get job title suggestions based on existing job titles.
 * Uses Affinda's Resume Search Suggestion API.
 * Returns an array of suggested job title names.
 */
export async function suggestJobTitles(existingTitles: string[]): Promise<string[]> {
  const client = getAffindaClient();
  if (!client) return [];

  try {
    const result = await client.getResumeSearchSuggestionJobTitle(existingTitles);
    const suggestions = result as unknown as { data?: { name: string }[]; name?: string }[];
    if (Array.isArray(suggestions)) {
      return suggestions
        .map((s) => (typeof s === "string" ? s : s.name || s.data?.name || ""))
        .filter(Boolean) as string[];
    }
    if (suggestions && typeof suggestions === "object") {
      const data = (suggestions as Record<string, unknown>).data;
      if (Array.isArray(data)) {
        return data
          .map((s: unknown) =>
            typeof s === "string" ? s : (s as Record<string, unknown>)?.name || ""
          )
          .filter(Boolean) as string[];
      }
    }
    return [];
  } catch (error) {
    console.error("[AFFINDA] Job title suggestion failed:", error);
    return [];
  }
}

/**
 * Get a resume-job match score.
 * Uses Affinda's Resume Search Match API.
 * Returns a score between 0 and 1.
 */
export async function getResumeJobMatchScore(
  resumeIdentifier: string,
  jobDescriptionIdentifier: string
): Promise<number | null> {
  const client = getAffindaClient();
  if (!client) return null;

  try {
    const result = await client.getResumeSearchMatch(resumeIdentifier, jobDescriptionIdentifier);
    const matchResult = result as unknown as { score?: number };
    return matchResult.score ?? null;
  } catch (error) {
    console.error("[AFFINDA] Resume-job match failed:", error);
    return null;
  }
}
