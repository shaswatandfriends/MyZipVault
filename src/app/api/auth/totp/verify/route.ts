import { NextResponse } from "next/server";
import { verifySync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { db } from "@/lib/db";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    // Fetch the TOTP secret from platform_settings
    const setting = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_totp_secret" },
    });

    if (!setting?.setting_value) {
      return NextResponse.json(
        { error: "TOTP is not configured yet" },
        { status: 400 }
      );
    }

    const secret = setting.setting_value;

    // Verify the token using otplib v13 API
    const result = verifySync({ token, secret, crypto, base32 });

    if (!result.valid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify TOTP token" },
      { status: 500 }
    );
  }
}
