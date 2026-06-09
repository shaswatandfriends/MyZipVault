import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";

const BUCKET = "vaultsign-templates";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await db.vaultSignTemplate.findMany({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
    });

    const templatesWithUrls = await Promise.all(
      templates.map(async (t) => {
        let previewUrl = "";
        try {
          if (t.document_url) {
            previewUrl = await getSignedUrl(BUCKET, t.document_url, 900);
          }
        } catch {}
        return { ...t, preview_url: previewUrl };
      })
    );

    return NextResponse.json({ templates: templatesWithUrls });
  } catch (error) {
    console.error("[VAULTSIGN-TEMPLATES-LIST]", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
