import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/otp-email";

/**
 * GET or POST /api/auth/otp/debug-send?secret=XXX
 *
 * TEMPORARY DEBUG ENDPOINT — generates a fresh OTP, stores it in DB,
 * sends the email, AND returns the OTP directly in the HTTP response.
 *
 * Also runs the verify logic internally to confirm the OTP would pass verification.
 *
 * Protected by a hardcoded debug secret to prevent public abuse.
 *
 * ⚠️ REMOVE THIS ENDPOINT BEFORE PRODUCTION GO-LIVE.
 */
const DEBUG_SECRET = "mzv-debug-2026";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  return handleDebugSend(request);
}

export async function POST(request: NextRequest) {
  return handleDebugSend(request);
}

async function handleDebugSend(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (secret !== DEBUG_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";
    if (!SUPERADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        step: "env_check",
        error: "SUPERADMIN_EMAIL env var is not set on Vercel",
      }, { status: 500 });
    }

    // Find the superadmin user (same query as /api/auth/otp/send)
    const user = await db.user.findFirst({
      where: {
        email: { equals: SUPERADMIN_EMAIL, mode: "insensitive" },
        role: "super_admin",
      },
    });

    if (!user) {
      // Diagnostic: how many super_admin users exist? What emails?
      const allSuperAdmins = await db.user.findMany({
        where: { role: "super_admin" },
        select: { id: true, email: true, account_status: true },
      });
      return NextResponse.json({
        success: false,
        step: "user_lookup",
        error: "No super_admin user found matching SUPERADMIN_EMAIL env var",
        superadmin_email_env: SUPERADMIN_EMAIL,
        all_super_admin_users_in_db: allSuperAdmins,
        hint: "The env var value must EXACTLY match one of the emails above (case-insensitive).",
      }, { status: 400 });
    }

    // Generate a fresh OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store in DB (upsert — overwrites any previous OTP)
    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_code" },
      update: { setting_value: otp, updated_by: user.id },
      create: { setting_key: "superadmin_otp_code", setting_value: otp, updated_by: user.id },
    });

    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_expires" },
      update: { setting_value: expiresAt, updated_by: user.id },
      create: { setting_key: "superadmin_otp_expires", setting_value: expiresAt, updated_by: user.id },
    });

    await db.platformSetting.upsert({
      where: { setting_key: "superadmin_otp_sent_at" },
      update: { setting_value: new Date().toISOString(), updated_by: user.id },
      create: { setting_key: "superadmin_otp_sent_at", setting_value: new Date().toISOString(), updated_by: user.id },
    });

    // Send the email
    const emailSent = await sendOtpEmail(SUPERADMIN_EMAIL, otp);

    // ─── SIMULATE THE VERIFY ROUTE LOGIC (in-line) ───────────────────
    // This is the exact same code as /api/auth/otp/verify/route.ts
    // We run it here to confirm the OTP would pass verification.
    const otpRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_code" },
    });
    const expiryRecord = await db.platformSetting.findUnique({
      where: { setting_key: "superadmin_otp_expires" },
    });

    let verifySimulation: any = {
      otp_record_found: !!otpRecord?.setting_value,
      expiry_record_found: !!expiryRecord?.setting_value,
    };

    if (!otpRecord?.setting_value || !expiryRecord?.setting_value) {
      verifySimulation.would_pass = false;
      verifySimulation.failure_reason = "OTP record not found in DB after write (DB write failed silently)";
    } else {
      const expiryDate = new Date(expiryRecord.setting_value);
      verifySimulation.expiry_date = expiryRecord.setting_value;
      verifySimulation.is_expired = new Date() > expiryDate;

      if (verifySimulation.is_expired) {
        verifySimulation.would_pass = false;
        verifySimulation.failure_reason = "OTP expired (shouldn't happen — we just generated it)";
      } else {
        // Timing-safe comparison (same as verify route)
        const matches = timingSafeEqual(otp, otpRecord.setting_value);
        verifySimulation.otp_matches_db = matches;
        verifySimulation.generated_otp = otp;
        verifySimulation.db_otp = otpRecord.setting_value;

        if (!matches) {
          verifySimulation.would_pass = false;
          verifySimulation.failure_reason = "Generated OTP doesn't match DB OTP (race condition?)";
        } else {
          // Check user role one more time (same as verify route)
          const verifyUser = await db.user.findUnique({
            where: { email: SUPERADMIN_EMAIL },
          });
          verifySimulation.verify_route_user_found = !!verifyUser;
          verifySimulation.verify_route_user_role = verifyUser?.role;
          verifySimulation.verify_route_user_status = verifyUser?.account_status;

          if (!verifyUser || verifyUser.role !== "super_admin") {
            verifySimulation.would_pass = false;
            verifySimulation.failure_reason = `Verify route user check failed — user found: ${!!verifyUser}, role: ${verifyUser?.role}`;
          } else if (verifyUser.account_status === "suspended" || verifyUser.account_status === "deleted") {
            verifySimulation.would_pass = false;
            verifySimulation.failure_reason = `Account status: ${verifyUser.account_status}`;
          } else {
            verifySimulation.would_pass = true;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: true,
      generated_otp: otp,
      email_sent: emailSent,
      email_address: SUPERADMIN_EMAIL,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
      },
      expires_at: expiresAt,
      verify_simulation: verifySimulation,
      instructions: verifySimulation.would_pass
        ? "✅ Verify route WOULD pass. The OTP login should work. If it doesn't, the issue is in the NextAuth signIn flow, not the verify route."
        : `❌ Verify route would FAIL with reason: ${verifySimulation.failure_reason}`,
    });
  } catch (error: any) {
    console.error("[OTP DEBUG SEND] Error:", error);
    return NextResponse.json({
      success: false,
      step: "exception",
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    }, { status: 500 });
  }
}
