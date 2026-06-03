import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const API_SERVICES = [
  "stripe",
  "sendgrid",
  "twilio",
  "affinda",
  "supabase",
] as const;

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

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
      return {
        serviceName,
        keyStatus: stored ? "Set" : "Not Set",
        maskedKey: stored ? maskKey(stored.encrypted_key) : null,
        updatedAt: stored?.updated_at ?? null,
        updatedBy: stored?.updated_by ?? null,
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

    // In production, encrypt the key before storage.
    // For now, we store the key directly (the encrypted_key field
    // represents what would be an encrypted value in production).
    await db.apiKey.upsert({
      where: { service_name: serviceName },
      create: {
        service_name: serviceName,
        encrypted_key: keyValue,
        updated_by: actionerId,
      },
      update: {
        encrypted_key: keyValue,
        updated_by: actionerId,
        updated_at: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "update_api_key",
        entity_type: "api_key",
        entity_id: null,
      },
    });

    return NextResponse.json({ success: true, message: "API key updated" });
  } catch (error) {
    console.error("Superadmin API Vault POST error:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}
