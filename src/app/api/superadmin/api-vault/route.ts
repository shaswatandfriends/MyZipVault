import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt, maskValue } from "@/lib/encryption";
import { isStripeConfigured } from "@/lib/stripe";
import { isSupabaseConfigured, isSupabaseAdminConfigured } from "@/lib/supabase";
import { isAffindaConfigured } from "@/lib/affinda";
import { isTwilioConfigured } from "@/lib/twilio";

const API_SERVICES = [
  "brevo",
  "stripe",
  "supabase",
  "affinda",
  "twilio",
] as const;

// Map service names to their environment variable keys
const SERVICE_ENV_MAP: Record<string, string[]> = {
  brevo: ["BREVO_API_KEY", "BREVO_SENDER_EMAIL"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_PUBLIC_KEY", "STRIPE_WEBHOOK_SECRET"],
  supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  affinda: ["AFFINDA_API_KEY"],
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
};

// Map service names to their live connection check functions
const SERVICE_STATUS_CHECK: Record<string, () => boolean> = {
  brevo: () => !!process.env.BREVO_API_KEY,
  stripe: () => isStripeConfigured(),
  supabase: () => isSupabaseConfigured() && isSupabaseAdminConfigured(),
  affinda: () => isAffindaConfigured(),
  twilio: () => isTwilioConfigured(),
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storedKeys = await db.apiKey.findMany();

    const services = API_SERVICES.map((serviceName) => {
      const stored = storedKeys.find((k) => k.service_name === serviceName);
      const isLive = SERVICE_STATUS_CHECK[serviceName]?.() ?? false;
      const envVars = SERVICE_ENV_MAP[serviceName] || [];

      // Check which env vars are set
      const envVarStatus = envVars.map((key) => ({
        key,
        isSet: !!process.env[key],
      }));

      return {
        serviceName,
        keyStatus: stored ? "Set (Encrypted in DB)" : "Not Set",
        maskedKey: stored ? maskValue(decrypt(stored.encrypted_key)) : null,
        liveConnection: isLive,
        liveLabel: isLive ? "Connected" : "Not Connected",
        updatedAt: stored?.updated_at ?? null,
        updatedBy: stored?.updated_by ?? null,
        environmentVariables: envVarStatus,
      };
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Superadmin API Vault GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actionerId = parseInt(session.user.id as string, 10);
    const body = await request.json();
    const { serviceName, keyValue } = body;

    if (!serviceName || !keyValue) {
      return NextResponse.json(
        { error: "Service name and key value are required" },
        { status: 400 }
      );
    }

    // Validate service name
    if (!API_SERVICES.includes(serviceName as typeof API_SERVICES[number])) {
      return NextResponse.json(
        { error: "Invalid service name" },
        { status: 400 }
      );
    }

    // Encrypt the key before storage using AES-256-CBC
    const encryptedValue = encrypt(keyValue);

    await db.apiKey.upsert({
      where: { service_name: serviceName },
      create: {
        service_name: serviceName,
        encrypted_key: encryptedValue,
        updated_by: actionerId,
      },
      update: {
        encrypted_key: encryptedValue,
        updated_by: actionerId,
        updated_at: new Date(),
      },
    });

    // Also set the process.env at runtime so the service connects immediately
    const envVars = SERVICE_ENV_MAP[serviceName];
    if (envVars && envVars.length > 0) {
      // For services with a single key, set the first env var
      if (serviceName === "brevo") process.env.BREVO_API_KEY = keyValue;
      else if (serviceName === "affinda") process.env.AFFINDA_API_KEY = keyValue;
      // For multi-key services, the main key is stored; other keys should be in .env
    }

    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "update_api_key",
        entity_type: "api_key",
        entity_id: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "API key encrypted and saved. Restart the server for full effect on multi-key services.",
    });
  } catch (error) {
    console.error("Superadmin API Vault POST error:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}
