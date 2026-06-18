import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// Cron job: Mark expired documents and send notifications
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const now = new Date();

    // Find documents that have passed their expiry date and are still sent/partially_signed
    const expiredDocs = await db.vaultSignDocument.findMany({
      where: {
        status: { in: ["sent", "partially_signed"] },
        expiry_date: { lt: now },
      },
    });

    let expiredCount = 0;

    for (const doc of expiredDocs) {
      const auditTrail: AuditTrailEntry[] = JSON.parse(doc.audit_trail || "[]");
      auditTrail.push({
        event: "document_expired",
        user_name: "System",
        timestamp: new Date().toISOString(),
      });

      await db.vaultSignDocument.update({
        where: { id: doc.id },
        data: {
          status: "expired",
          audit_trail: JSON.stringify(auditTrail),
          updated_at: new Date(),
        },
      });

      expiredCount++;
    }

    return NextResponse.json({
      success: true,
      documentsExpired: expiredCount,
    });
  } catch (error) {
    console.error("[VAULTSIGN] Expiry cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
