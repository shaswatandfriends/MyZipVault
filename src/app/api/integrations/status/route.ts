import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSupabaseConfigured, isSupabaseAdminConfigured } from "@/lib/supabase";
import { isStripeConfigured } from "@/lib/stripe";
import { isAffindaConfigured } from "@/lib/affinda";
import { isTwilioConfigured } from "@/lib/twilio";

export async function GET() {
  const session = await getServerSession(authOptions);

  // Only super admins can see integration status
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as Record<string, unknown>).role;
  if (userRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const integrations = {
    database: {
      name: "Prisma Database",
      provider: process.env.DATABASE_URL?.startsWith("postgresql") ? "PostgreSQL" : "SQLite",
      status: "connected",
      configured: true,
      details: {
        url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") || "Not set",
      },
    },
    auth: {
      name: "NextAuth",
      provider: "CredentialsProvider",
      status: "connected",
      configured: true,
      details: {
        secret: process.env.NEXTAUTH_SECRET ? "Set" : "Not set",
        url: process.env.NEXTAUTH_URL || "Not set",
      },
    },
    encryption: {
      name: "AES-256-CBC Encryption",
      status: "connected",
      configured: true,
      details: {
        key: process.env.ENCRYPTION_KEY ? "Set (change for production!)" : "Not set",
      },
    },
    brevo: {
      name: "Brevo Email",
      status: BREVO_API_KEY ? "connected" : "not_configured",
      configured: !!BREVO_API_KEY,
      details: {
        apiKey: BREVO_API_KEY ? `${BREVO_API_KEY.substring(0, 8)}...` : "Not set",
        senderEmail: process.env.BREVO_SENDER_EMAIL || "Not set",
        apiEndpoint: "https://api.brevo.com/v3/smtp/email",
      },
    },
    supabaseStorage: {
      name: "Supabase Storage",
      status: isSupabaseConfigured() ? "connected" : "not_configured",
      configured: isSupabaseConfigured(),
      adminConfigured: isSupabaseAdminConfigured(),
      details: {
        url: process.env.SUPABASE_URL || "Not set",
        anonKey: process.env.SUPABASE_ANON_KEY ? `${process.env.SUPABASE_ANON_KEY.substring(0, 8)}...` : "Not set",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set",
        buckets: ["credentials", "resumes", "baa-documents"],
      },
    },
    stripe: {
      name: "Stripe Payments",
      status: isStripeConfigured() ? "connected" : "not_configured",
      configured: isStripeConfigured(),
      details: {
        secretKey: process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 8)}...` : "Not set",
        publicKey: process.env.STRIPE_PUBLIC_KEY ? `${process.env.STRIPE_PUBLIC_KEY.substring(0, 8)}...` : "Not set",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? "Set" : "Not set",
        fallbackMode: !isStripeConfigured() ? "Credits granted without payment" : null,
      },
    },
    affinda: {
      name: "Affinda Resume Parsing",
      status: isAffindaConfigured() ? "connected" : "not_configured",
      configured: isAffindaConfigured(),
      details: {
        apiKey: process.env.AFFINDA_API_KEY ? `${process.env.AFFINDA_API_KEY.substring(0, 8)}...` : "Not set",
      },
    },
    twilio: {
      name: "Twilio SMS",
      status: isTwilioConfigured() ? "connected" : "not_configured",
      configured: isTwilioConfigured(),
      details: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : "Not set",
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || "Not set",
        featureFlag: "sms_notifications (in DB)",
      },
    },
  };

  return NextResponse.json({ integrations });
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
