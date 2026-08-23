import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateBaaPdf } from "@/lib/pdf";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";
import { logBaaSigned } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Get BAA settings
    const baaRequiredSetting = await db.platformSetting.findUnique({
      where: { setting_key: "baa_required" },
    });
    const baaContentSetting = await db.platformSetting.findUnique({
      where: { setting_key: "baa_content" },
    });

    const baaRequired = baaRequiredSetting?.setting_value === "true";
    const baaContent = baaContentSetting?.setting_value ?? "";

    // Get organization BAA status
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        baa_status: true,
        baa_signed_by_name: true,
        baa_signed_by_title: true,
        baa_signed_at: true,
        baa_document_url: true,
      },
    });

    return NextResponse.json({
      baaRequired,
      baaContent,
      organization: {
        name: organization?.name ?? "",
        baaStatus: organization?.baa_status ?? "pending",
        signedByName: organization?.baa_signed_by_name ?? null,
        signedByTitle: organization?.baa_signed_by_title ?? null,
        signedAt: organization?.baa_signed_at ?? null,
        baaDocumentUrl: organization?.baa_document_url ?? null,
      },
    });
  } catch (error) {
    console.error("BAA GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch BAA data" },
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
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    if (userRole !== "client_admin") {
      return NextResponse.json({ error: "Only admin can sign the BAA" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { fullName, title, agreed } = body;

    if (!fullName || !title || !agreed) {
      return NextResponse.json(
        { error: "Full name, title, and agreement are required" },
        { status: 400 }
      );
    }

    // Get BAA content for PDF generation
    const baaContentSetting = await db.platformSetting.findUnique({
      where: { setting_key: "baa_content" },
    });
    const baaContent = baaContentSetting?.setting_value ?? "";

    const signedAt = new Date();

    // Update organization BAA status
    await db.organization.update({
      where: { id: organizationId },
      data: {
        baa_status: "signed",
        baa_signed_by_name: fullName,
        baa_signed_by_title: title,
        baa_signed_at: signedAt,
      },
    });

    // Generate BAA PDF
    let baaDocumentUrl: string | null = null;
    try {
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      const pdfBuffer = await generateBaaPdf({
        organizationName: organization?.name ?? "Unknown Organization",
        signerName: fullName,
        signerTitle: title,
        baaContent,
        signedAt,
      });

      // Upload PDF to Supabase Storage
      const uploadResult = await uploadFile(
        STORAGE_BUCKETS.BAA,
        `org-${organizationId}`,
        pdfBuffer,
        `BAA-${organization?.name?.replace(/\s+/g, "-") ?? "org"}-${signedAt.toISOString().split("T")[0]}.pdf`,
        "application/pdf"
      );

      baaDocumentUrl = uploadResult.url;

      // Update organization with document URL
      await db.organization.update({
        where: { id: organizationId },
        data: {
          baa_document_url: baaDocumentUrl,
        },
      });

      // ─── Notify super admins that BAA is pending review ───
      try {
        const orgName = organization?.name ?? "An organization";
        const superAdmins = await db.user.findMany({
          where: { role: "super_admin" },
          select: { id: true },
        });

        const { createNotification } = await import("@/lib/notifications/create");
        for (const admin of superAdmins) {
          try {
            await createNotification({
              userId: admin.id,
              category: "compliance",
              priority: "important",
              title: "BAA pending review 📄",
              message: `${orgName} has uploaded their BAA document for review.`,
              actionUrl: "/superadmin/companies",
              actionLabel: "Review BAA",
              relatedEntityId: organizationId,
              relatedEntityType: "organization",
            });
          } catch (adminNotifErr) {
            console.error("[BAA] Failed to notify super admin:", admin.id, adminNotifErr);
          }
        }
      } catch (baaNotifErr) {
        console.error("[BAA] Failed to send BAA pending review notifications:", baaNotifErr);
        // Non-blocking
      }
    } catch (pdfError) {
      console.error("[BAA] PDF generation/upload failed (non-fatal):", pdfError);
      // BAA signing still succeeds even if PDF generation fails
    }

    // Create audit log
    const userId = Number((session.user as Record<string, unknown>).id);
    await logBaaSigned(userId, organizationId);

    return NextResponse.json({
      success: true,
      message: "BAA signed successfully",
      baaDocumentUrl,
    });
  } catch (error) {
    console.error("BAA POST error:", error);
    return NextResponse.json(
      { error: "Failed to sign BAA" },
      { status: 500 }
    );
  }
}
