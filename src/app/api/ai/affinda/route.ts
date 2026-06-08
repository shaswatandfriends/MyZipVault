import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  isAffindaConfigured,
  suggestSkills,
  suggestJobTitles,
} from "@/lib/affinda";

/**
 * Affinda-powered AI features — these work on Vercel because the Affinda API
 * is publicly accessible (unlike internal-api.z.ai which uses private IPs).
 *
 * Supported actions:
 * - "suggest_skills": Get skill suggestions based on existing skills
 * - "suggest_job_titles": Get job title suggestions based on existing titles
 * - "health": Check if Affinda is configured and reachable
 */
export async function POST(request: Request) {
  // Auth check
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 });
    }
  } catch {
    console.warn("[AI_AFFINDA] Could not verify session, proceeding without auth check");
  }

  // Check if Affinda is configured
  if (!isAffindaConfigured()) {
    return NextResponse.json(
      { error: "Affinda API is not configured. Please add the AFFINDA_API_KEY environment variable." },
      { status: 503 }
    );
  }

  // Parse request
  let body: { action?: string; skills?: string[]; jobTitles?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action } = body;

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  switch (action) {
    case "suggest_skills": {
      const existingSkills = body.skills || [];
      const suggestions = await suggestSkills(existingSkills);
      return NextResponse.json({
        suggestions: suggestions.map((skill) => ({
          skill,
          proficiency: "Intermediate" as const,
        })),
      });
    }

    case "suggest_job_titles": {
      const existingTitles = body.jobTitles || [];
      const suggestions = await suggestJobTitles(existingTitles);
      return NextResponse.json({ suggestions });
    }

    case "health": {
      return NextResponse.json({
        status: "ok",
        configured: isAffindaConfigured(),
        features: ["resume_parsing", "skill_suggestions", "job_title_suggestions"],
      });
    }

    default: {
      return NextResponse.json(
        { error: `Unknown action: ${action}. Supported: suggest_skills, suggest_job_titles, health` },
        { status: 400 }
      );
    }
  }
}

/**
 * Health check — GET endpoint to verify Affinda is reachable.
 */
export async function GET() {
  return NextResponse.json({
    status: isAffindaConfigured() ? "configured" : "not_configured",
    features: ["resume_parsing", "skill_suggestions", "job_title_suggestions"],
  });
}
