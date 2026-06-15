import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/banners
 * Returns active, non-expired banners for the current user's role.
 * Pinned banners appear first, then by created_at desc.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ banners: [] });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;

    // Map user roles to the target_role values they should see
    const targetRoles: string[] = [];
    if (userRole === "candidate") {
      targetRoles.push("candidate");
    } else if (userRole === "client_recruiter") {
      targetRoles.push("client_recruiter");
    } else if (userRole === "client_admin") {
      targetRoles.push("client_admin");
    } else {
      // super_admin / platform_admin don't see banners
      return NextResponse.json({ banners: [] });
    }

    const now = new Date();

    const banners = await db.banner.findMany({
      where: {
        target_role: { in: targetRoles },
        is_active: true,
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } },
        ],
      },
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        image_url: true,
        cta_text: true,
        cta_link: true,
        is_pinned: true,
        carousel_duration: true,
        expires_at: true,
      },
    });

    return NextResponse.json({
      banners: banners.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        imageUrl: b.image_url,
        ctaText: b.cta_text,
        ctaLink: b.cta_link,
        isPinned: b.is_pinned,
        carouselDuration: b.carousel_duration,
        expiresAt: b.expires_at,
      })),
    });
  } catch (error) {
    console.error("Banners GET error:", error);
    return NextResponse.json({ banners: [] });
  }
}
