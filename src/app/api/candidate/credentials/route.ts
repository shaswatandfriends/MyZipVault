import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const credentials = await db.credential.findMany({
      where: { candidate_user_id: userId },
      orderBy: { uploaded_at: "desc" },
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error("[CANDIDATE_CREDENTIALS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
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

    const userId = Number(session.user.id);
    const body = await request.json();
    const { document_name, file_base64, file_name, expiration_date, reminder_enabled } = body;

    if (!document_name || !file_base64) {
      return NextResponse.json(
        { error: "Document name and file are required" },
        { status: 400 }
      );
    }

    // Decode base64 and save file
    const buffer = Buffer.from(file_base64, "base64");
    const uploadDir = path.join(process.cwd(), "public", "upload", "credentials");
    await mkdir(uploadDir, { recursive: true });

    const uniqueFileName = `${userId}_${Date.now()}_${file_name || "document"}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/upload/credentials/${uniqueFileName}`;

    // Create credential record
    const credential = await db.credential.create({
      data: {
        candidate_user_id: userId,
        document_name,
        file_url: fileUrl,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
        reminder_enabled: reminder_enabled ?? false,
        status: "active",
        verification_status: "pending_review",
      },
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error("[CANDIDATE_CREDENTIALS_POST]", error);
    return NextResponse.json(
      { error: "Failed to upload credential" },
      { status: 500 }
    );
  }
}
