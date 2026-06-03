import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSignedUrl, STORAGE_BUCKETS } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl, bucket } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    }

    // If it's a base64 data URL, return as-is (already accessible)
    if (fileUrl.startsWith("data:")) {
      return NextResponse.json({ signedUrl: fileUrl, isLocal: true });
    }

    // Determine the bucket
    const storageBucket = bucket || STORAGE_BUCKETS.CREDENTIALS;

    // Generate a signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(storageBucket, fileUrl, 3600);

    return NextResponse.json({ signedUrl, isLocal: false });
  } catch (error) {
    console.error("[SIGNED_URL] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
