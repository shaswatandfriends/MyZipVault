import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/recruiter/profile-settings
 *
 * Returns the recruiter's profile settings (bio, social media, display prefs).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        bio: true,
        linkedin_url: true,
        twitter_url: true,
        instagram_url: true,
        facebook_url: true,
        show_phone_publicly: true,
        show_email_publicly: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[PROFILE_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch profile settings" }, { status: 500 });
  }
}

/**
 * PUT /api/recruiter/profile-settings
 *
 * Updates the recruiter's profile settings.
 *
 * Body: {
 *   bio?: string,
 *   linkedin_url?: string,
 *   twitter_url?: string,
 *   instagram_url?: string,
 *   facebook_url?: string,
 *   show_phone_publicly?: boolean,
 *   show_email_publicly?: boolean,
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.bio !== undefined) updateData.bio = String(body.bio).trim().slice(0, 500) || null;
    if (body.linkedin_url !== undefined) updateData.linkedin_url = String(body.linkedin_url).trim().slice(0, 255) || null;
    if (body.twitter_url !== undefined) updateData.twitter_url = String(body.twitter_url).trim().slice(0, 255) || null;
    if (body.instagram_url !== undefined) updateData.instagram_url = String(body.instagram_url).trim().slice(0, 255) || null;
    if (body.facebook_url !== undefined) updateData.facebook_url = String(body.facebook_url).trim().slice(0, 255) || null;
    if (body.show_phone_publicly !== undefined) updateData.show_phone_publicly = !!body.show_phone_publicly;
    if (body.show_email_publicly !== undefined) updateData.show_email_publicly = !!body.show_email_publicly;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PROFILE_SETTINGS_PUT]", error);
    return NextResponse.json({ error: "Failed to save profile settings" }, { status: 500 });
  }
}
