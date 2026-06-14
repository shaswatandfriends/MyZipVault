import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

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

    const body = await request.json();
    const { file: base64Data, filename, contentType } = body;

    if (!base64Data || !filename) {
      return NextResponse.json(
        { error: "File data and filename are required" },
        { status: 400 }
      );
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to Supabase Storage
    const result = await uploadFile(
      "banners",
      "images",
      buffer,
      filename,
      contentType || "image/png"
    );

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Banner upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
