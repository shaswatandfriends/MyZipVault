import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        candidate_profile: {
          select: {
            profile_completion_pct: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      profile_completion_pct: user.candidate_profile?.profile_completion_pct ?? 0,
    });
  } catch (error) {
    console.error("[CANDIDATE_PROFILE_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();
    const { first_name, last_name, phone } = body;

    // Update user record
    await db.user.update({
      where: { id: userId },
      data: {
        first_name: first_name ?? undefined,
        last_name: last_name ?? undefined,
        phone: phone ?? undefined,
      },
    });

    // Update candidate profile if it exists
    const existingProfile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
    });

    if (existingProfile) {
      await db.candidateProfile.update({
        where: { user_id: userId },
        data: {
          first_name: first_name ?? existingProfile.first_name,
          last_name: last_name ?? existingProfile.last_name,
          phone: phone ?? existingProfile.phone,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CANDIDATE_PROFILE_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
