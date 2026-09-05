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

    const userId = Number((session.user as Record<string, unknown>).id);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        email_verified_at: true,
        candidate_profile: {
          select: {
            profile_completion_pct: true,
            notification_preferences: true,
          },
        },
        resumes: { select: { id: true } },
        credentials: { select: { id: true } },
        candidate_references: { select: { id: true } },
        calendar_availabilities: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse notification preferences from JSON string
    let notificationPreferences = {
      email_notifications: true,
      sms_notifications: false,
      reminder_notifications: true,
    };
    if (user.candidate_profile?.notification_preferences) {
      try {
        notificationPreferences = {
          ...notificationPreferences,
          ...JSON.parse(user.candidate_profile.notification_preferences),
        };
      } catch {
        // Use defaults if parsing fails
      }
    }

    return NextResponse.json({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      emailVerified: !!user.email_verified_at,
      hasResume: user.resumes.length > 0,
      credentialCount: user.credentials.length,
      referenceCount: user.candidate_references.length,
      hasAvailability: user.calendar_availabilities.length > 0,
      // Calculate profile completion dynamically with new weights:
      // Profile info 20%, Email verified 15%, Resume 25%, Credential 15%, Reference 15%, Calendar 10%
      profileCompletionPct:
        (user.first_name && user.last_name && user.phone ? 20 : 0) +
        (user.email_verified_at ? 15 : 0) +
        (user.resumes.length > 0 ? 25 : 0) +
        (user.credentials.length > 0 ? 15 : 0) +
        (user.candidate_references.length > 0 ? 15 : 0) +
        (user.calendar_availabilities.length > 0 ? 10 : 0),
      notification_preferences: notificationPreferences,
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

    const userId = Number((session.user as Record<string, unknown>).id);
    const body = await request.json();
    const { first_name, last_name, phone, notification_preferences } = body;

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
      const profileUpdateData: Record<string, unknown> = {};

      if (first_name !== undefined) profileUpdateData.first_name = first_name;
      if (last_name !== undefined) profileUpdateData.last_name = last_name;
      if (phone !== undefined) profileUpdateData.phone = phone;

      if (notification_preferences !== undefined) {
        profileUpdateData.notification_preferences = JSON.stringify(notification_preferences);
      }

      await db.candidateProfile.update({
        where: { user_id: userId },
        data: profileUpdateData,
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
