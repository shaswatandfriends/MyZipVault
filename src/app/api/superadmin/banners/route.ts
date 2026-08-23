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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const banners = await db.banner.findMany({
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
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
        targetRole: b.target_role,
        isActive: b.is_active,
        isPinned: b.is_pinned,
        expiresAt: b.expires_at,
        carouselDuration: b.carousel_duration,
        createdBy: b.created_by,
        creatorName: b.creator
          ? [b.creator.first_name, b.creator.last_name].filter(Boolean).join(" ") || b.creator.email
          : null,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
    });
  } catch (error) {
    console.error("Superadmin Banners GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const {
          title,
          description,
          imageUrl,
          ctaText,
          ctaLink,
          targetRole,
          isActive,
          isPinned,
          expiresAt,
          carouselDuration,
        } = body;

        if (!title || !targetRole) {
          return NextResponse.json(
            { error: "Title and target role are required" },
            { status: 400 }
          );
        }

        const validRoles = ["candidate", "client_recruiter", "client_admin"];
        if (!validRoles.includes(targetRole)) {
          return NextResponse.json(
            { error: "Invalid target role. Must be candidate, client_recruiter, or client_admin" },
            { status: 400 }
          );
        }

        const banner = await db.banner.create({
          data: {
            title,
            description: description || null,
            image_url: imageUrl || null,
            cta_text: ctaText || null,
            cta_link: ctaLink || null,
            target_role: targetRole,
            is_active: isActive ?? true,
            is_pinned: isPinned ?? false,
            expires_at: expiresAt ? new Date(expiresAt) : null,
            carousel_duration: carouselDuration ?? 5,
            created_by: actionerId,
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "create_banner",
            entity_type: "banner",
            entity_id: banner.id,
          },
        });

        return NextResponse.json({ success: true, id: banner.id });
      }

      case "update": {
        const {
          id,
          title,
          description,
          imageUrl,
          ctaText,
          ctaLink,
          targetRole,
          isActive,
          isPinned,
          expiresAt,
          carouselDuration,
        } = body;

        if (!id) {
          return NextResponse.json(
            { error: "Banner ID is required" },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (imageUrl !== undefined) updateData.image_url = imageUrl;
        if (ctaText !== undefined) updateData.cta_text = ctaText;
        if (ctaLink !== undefined) updateData.cta_link = ctaLink;
        if (targetRole !== undefined) updateData.target_role = targetRole;
        if (isActive !== undefined) updateData.is_active = isActive;
        if (isPinned !== undefined) updateData.is_pinned = isPinned;
        if (expiresAt !== undefined) updateData.expires_at = expiresAt ? new Date(expiresAt) : null;
        if (carouselDuration !== undefined) updateData.carousel_duration = carouselDuration;

        await db.banner.update({
          where: { id },
          data: updateData,
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "update_banner",
            entity_type: "banner",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }

      case "toggle": {
        const { id, isActive } = body;
        if (!id || isActive === undefined) {
          return NextResponse.json(
            { error: "Banner ID and active status are required" },
            { status: 400 }
          );
        }

        await db.banner.update({
          where: { id },
          data: { is_active: isActive },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "toggle_banner",
            entity_type: "banner",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }

      case "delete": {
        const { id } = body;
        if (!id) {
          return NextResponse.json(
            { error: "Banner ID is required" },
            { status: 400 }
          );
        }

        await db.banner.delete({ where: { id } });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "delete_banner",
            entity_type: "banner",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Banners POST error:", error);
    return NextResponse.json(
      { error: "Failed to process banner action" },
      { status: 500 }
    );
  }
}
