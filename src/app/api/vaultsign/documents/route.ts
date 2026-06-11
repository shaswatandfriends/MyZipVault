import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import type { SignField, AuditTrailEntry } from "@/lib/vaultsign/types";

// GET: List documents for the recruiter's organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "client_recruiter" && role !== "client_admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (!orgId && role !== "super_admin") {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (role !== "super_admin") {
      where.organization_id = orgId;
    }
    if (status) {
      where.status = status;
    }
    if (type) {
      where.document_type = type;
    }
    if (search) {
      where.document_name = { contains: search, mode: "insensitive" };
    }

    const [documents, total] = await Promise.all([
      db.vaultSignDocument.findMany({
        where,
        include: {
          signers: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              signer_index: true,
              status: true,
              signed_at: true,
            },
            orderBy: { signing_order_position: "asc" },
          },
          template: {
            select: { id: true, name: true },
          },
          creator: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vaultSignDocument.count({ where }),
    ]);

    // Parse JSON fields
    const parsedDocs = documents.map((doc: any) => ({
      ...doc,
      sign_fields: JSON.parse(doc.sign_fields || "[]"),
      placeholder_values: JSON.parse(doc.placeholder_values || "{}"),
      audit_trail: JSON.parse(doc.audit_trail || "[]"),
    }));

    return NextResponse.json({
      documents: parsedDocs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[VAULTSIGN] List documents error:", error);
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}

// POST: Create a new draft document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "client_recruiter" && role !== "client_admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const {
      document_name,
      document_type = "custom",
      source_type = "word",
      template_id,
      original_file_url,
      tiptap_content,
      signing_order = "sequential",
      expiry_date,
      personal_message,
      placeholder_values = {},
      sign_fields = [],
      signers = [],
    } = body;

    if (!document_name) {
      return NextResponse.json({ error: "Document name is required" }, { status: 400 });
    }

    // If creating from template, load template data
    let templateTiptapContent = tiptap_content;
    let templateSignFields = sign_fields;
    let templatePlaceholderVars = "{}";
    let templateHeaderConfig = "{}";
    let templateFooterConfig = "{}";
    let templateFileUrl = original_file_url;

    if (template_id) {
      const template = await db.vaultSignTemplate.findUnique({
        where: { id: template_id },
      });
      if (template) {
        templateTiptapContent = templateTiptapContent || template.tiptap_content;
        templateSignFields = JSON.parse(template.predefined_sign_fields || "[]");
        templatePlaceholderVars = template.placeholder_variables;
        templateHeaderConfig = template.header_config;
        templateFooterConfig = template.footer_config;
        templateFileUrl = templateFileUrl || template.original_file_url;
      }
    }

    // Default header/footer config for blank documents
    const defaultHeaderConfig = !template_id ? JSON.stringify({
      show_logo: true,
      show_company_name: true,
      show_contact: true,
      show_address: true,
      show_document_title: true,
    }) : templateHeaderConfig;

    const defaultFooterConfig = !template_id ? JSON.stringify({
      show_rights_reserved: true,
      show_powered_by: true,
      show_page_numbers: true,
    }) : templateFooterConfig;

    // Create the document
    const document = await db.vaultSignDocument.create({
      data: {
        organization_id: orgId,
        created_by_user_id: parseInt(session.user.id),
        template_id: template_id || null,
        document_name,
        document_type,
        source_type,
        original_file_url: templateFileUrl || null,
        tiptap_content: templateTiptapContent || null,
        signing_order,
        expiry_date: expiry_date ? new Date(expiry_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        personal_message: personal_message || null,
        status: "draft",
        placeholder_values: JSON.stringify(placeholder_values),
        sign_fields: JSON.stringify(templateSignFields),
        header_config: defaultHeaderConfig,
        footer_config: defaultFooterConfig,
        audit_trail: JSON.stringify([
          {
            event: "document_created",
            user_name: `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim() || session.user.email,
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
            timestamp: new Date().toISOString(),
          } as AuditTrailEntry,
        ]),
      },
    });

    // Create signers if provided
    if (signers.length > 0) {
      const signerData = signers.map((signer: any, index: number) => ({
        document_id: document.id,
        user_id: signer.user_id || null,
        name: signer.name,
        email: signer.email,
        role: signer.role || "Candidate",
        signer_index: index,
        signing_order_position: signer.signing_order_position || (index + 1),
        status: "pending",
        sign_token: crypto.randomBytes(32).toString("hex"),
      }));

      await db.vaultSignSigner.createMany({ data: signerData });
    }

    // Return the created document with signers
    const fullDoc = await db.vaultSignDocument.findUnique({
      where: { id: document.id },
      include: {
        signers: true,
        template: { select: { id: true, name: true } },
        creator: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });

    return NextResponse.json({
      ...fullDoc,
      sign_fields: JSON.parse(fullDoc?.sign_fields || "[]"),
      placeholder_values: JSON.parse(fullDoc?.placeholder_values || "{}"),
      audit_trail: JSON.parse(fullDoc?.audit_trail || "[]"),
    }, { status: 201 });
  } catch (error) {
    console.error("[VAULTSIGN] Create document error:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
