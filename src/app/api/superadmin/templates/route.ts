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

    const templates = await db.emailTemplate.findMany({
      orderBy: { template_key: "asc" },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        templateKey: t.template_key,
        subject: t.subject,
        body: t.body,
        updatedBy: t.updated_by,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error) {
    console.error("Superadmin Templates GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
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
    const { templateKey, subject, body: templateBody } = body;

    if (!templateKey || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Template key, subject, and body are required" },
        { status: 400 }
      );
    }

    await db.emailTemplate.upsert({
      where: { template_key: templateKey },
      create: {
        template_key: templateKey,
        subject,
        body: templateBody,
        updated_by: actionerId,
      },
      update: {
        subject,
        body: templateBody,
        updated_by: actionerId,
        updated_at: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "update_email_template",
        entity_type: "email_template",
        entity_id: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Superadmin Templates POST error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}
