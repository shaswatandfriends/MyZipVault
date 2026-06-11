import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadDocument } from "@/lib/vaultsign/supabase-storage";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json({ error: "Only .pdf files are supported. Please edit your Word document and save as PDF before uploading." }, { status: 400 });
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const orgId = (session.user as Record<string, unknown>).organizationId as number || 0;
    const folder = `org-${orgId}/uploads`;
    const uploadResult = await uploadDocument(buffer, folder, file.name, file.type);

    return NextResponse.json({
      document_url: uploadResult.url,
      source_type: "pdf",
    });
  } catch (error) {
    console.error("[VAULTSIGN] Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
