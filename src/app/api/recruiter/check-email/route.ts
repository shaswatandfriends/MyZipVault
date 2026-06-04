import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      include: { candidate_profile: true },
    });

    if (!existingUser) {
      return NextResponse.json({ exists: false });
    }

    if (existingUser.role !== "candidate") {
      return NextResponse.json({
        exists: true,
        isCandidate: false,
        message: "A user with this email exists but is not a candidate.",
      });
    }

    return NextResponse.json({
      exists: true,
      isCandidate: true,
      candidateName: `${existingUser.first_name ?? ""} ${existingUser.last_name ?? ""}`.trim(),
      message: "This candidate already exists in the system.",
    });
  } catch (error) {
    console.error("Check email GET error:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}
