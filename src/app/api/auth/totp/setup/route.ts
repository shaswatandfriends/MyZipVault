import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  generateSecret,
  generateURI,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from "otplib";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

export async function POST() {
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

    // Check if TOTP is already set up
    const existing = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_totp_secret" },
    });

    if (existing?.setting_value) {
      return NextResponse.json(
        { error: "TOTP is already configured. Delete the existing secret first to reconfigure." },
        { status: 400 }
      );
    }

    // Generate a new TOTP secret using otplib v13 API
    const secret = generateSecret({ crypto, base32 });

    // Store the secret in platform_settings
    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_totp_secret" },
      update: {
        setting_value: secret,
        updated_by: Number(session.user.id),
      },
      create: {
        setting_key: "superadmin_totp_secret",
        setting_value: secret,
        updated_by: Number(session.user.id),
      },
    });

    // Generate the otpauth URI for QR code using otplib v13 API
    const userEmail = session.user.email ?? "superadmin";
    const otpAuthUri = generateURI({
      secret,
      label: userEmail,
      issuer: "MyZipVault SuperAdmin",
    });

    return NextResponse.json({
      secret,
      otpAuthUri,
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up TOTP" },
      { status: 500 }
    );
  }
}
