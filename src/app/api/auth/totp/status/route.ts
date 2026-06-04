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

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: super_admin role required" },
        { status: 403 }
      );
    }

    const setting = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_totp_secret" },
    });

    return NextResponse.json({ setup: !!setting?.setting_value });
  } catch (error) {
    console.error("TOTP status error:", error);
    return NextResponse.json(
      { error: "Failed to check TOTP status" },
      { status: 500 }
    );
  }
}
