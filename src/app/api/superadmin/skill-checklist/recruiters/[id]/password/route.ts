import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/superadmin/skill-checklist/recruiters/[id]/password
 *
 * @deprecated Plaintext password retrieval is no longer supported.
 *   This endpoint previously returned the stored `plain_password` for
 *   a recruiter. Storing recoverable plaintext passwords is a critical
 *   security violation (HIPAA 164.312(a)(2)(iv) and NIST 800-63B 5.1.1.2).
 *
 *   Use POST /api/superadmin/skill-checklist/recruiters/[id]/reset-password
 *   to issue a new one-time temporary password instead.
 *
 * Returns 410 Gone with a clear message for any legacy callers.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "super_admin" && userRole !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Touch `params` so Next.js doesn't warn about unused param
  await params;

  return NextResponse.json(
    {
      error:
        "Plaintext password retrieval is no longer supported. Use POST /api/superadmin/skill-checklist/recruiters/[id]/reset-password to issue a new one-time temporary password.",
      deprecated: true,
    },
    { status: 410 }
  );
}
