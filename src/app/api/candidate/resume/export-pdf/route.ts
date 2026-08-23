import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateResumePdf } from "@/lib/pdf";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the candidate's resume
    const resume = await db.resume.findFirst({
      where: { candidate_user_id: userId },
    });

    if (!resume || !resume.parsed_data) {
      return NextResponse.json(
        { error: "No resume data found. Please create or upload a resume first." },
        { status: 404 }
      );
    }

    // Parse the resume JSON data
    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(resume.parsed_data);
    } catch {
      return NextResponse.json(
        { error: "Resume data is corrupted. Please rebuild your resume." },
        { status: 400 }
      );
    }

    // Extract data from parsed resume
    const contact = (parsedData.contact || {}) as Record<string, string>;
    const name = contact.fullName || "Candidate";
    const email = contact.email || "";
    const phone = contact.phone || "";
    const summary = (parsedData.summary as string) || "";

    // Map experience from resume format to PDF format
    const rawExperience = (parsedData.experience || []) as Array<{
      facility?: string;
      unit?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
    const experience = rawExperience.map((exp) => ({
      title: exp.unit || "Healthcare Professional",
      company: exp.facility || "",
      dates: [
        exp.startDate || "",
        exp.endDate || "Present",
      ]
        .filter(Boolean)
        .join(" — "),
      description: exp.description || "",
    }));

    // Map education — Tedo returns graduationYear, uploaded resumes may use year
    const rawEducation = (parsedData.education || []) as Array<{
      school?: string;
      degree?: string;
      year?: string;
      graduationYear?: string;
    }>;
    const education = rawEducation.map((edu) => ({
      degree: edu.degree || "",
      school: edu.school || "",
      year: edu.graduationYear || edu.year || "",
    }));

    // Map skills — handle BOTH formats:
    //   1. Plain strings: ["IV therapy", "EHR"] (from Tedo AI builder)
    //   2. Objects: { skill: "IV therapy", proficiency: "Expert" } (from upload parse)
    const rawSkills = (parsedData.skills || []) as Array<
      string | { skill?: string; proficiency?: string }
    >;
    const skills = rawSkills.map((s) => {
      if (typeof s === "string") return s;
      const skillName = s.skill || "";
      const proficiency = s.proficiency || "";
      return proficiency ? `${skillName} (${proficiency})` : skillName;
    }).filter(Boolean);

    // Map certifications — Tedo returns issuer, uploaded resumes may use issuingOrg
    const rawCerts = (parsedData.certifications || []) as Array<{
      name?: string;
      issuer?: string;
      issuingOrg?: string;
      year?: string;
    }>;
    const certifications = rawCerts.map((cert) => {
      const parts = [cert.name, cert.issuer || cert.issuingOrg, cert.year].filter(Boolean);
      return parts.join(" — ");
    });

    // Generate the PDF
    const pdfBuffer = await generateResumePdf({
      name,
      email,
      phone,
      summary,
      experience,
      education,
      skills,
      certifications,
    });

    // Sanitize name for filename
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${safeName}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Resume PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate resume PDF" },
      { status: 500 }
    );
  }
}
