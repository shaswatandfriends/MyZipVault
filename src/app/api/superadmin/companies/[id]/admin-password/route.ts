import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    // Check for optional userId query param for specific user lookup
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    let user;
    if (userIdParam) {
      const userId = parseInt(userIdParam, 10);
      if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
      user = await db.user.findFirst({
        where: {
          id: userId,
          organization_id: companyId,
          role: { in: ["client_admin", "client_recruiter"] },
        },
        select: {
          id: true,
          email: true,
          plain_password: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      });
    } else {
      // Find the first admin/recruiter user for this organization
      user = await db.user.findFirst({
        where: {
          organization_id: companyId,
          role: { in: ["client_admin", "client_recruiter"] },
        },
        select: {
          id: true,
          email: true,
          plain_password: true,
          first_name: true,
          last_name: true,
          role: true,
        },
        orderBy: { role: "asc" }, // client_admin first
      });
    }

    if (!user) {
      return NextResponse.json({ error: "No admin user found for this company" }, { status: 404 });
    }

    return NextResponse.json({ password: user.plain_password || null });
  } catch (error) {
    console.error("[SUPERADMIN_ADMIN_PASSWORD_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch admin password" },
      { status: 500 }
    );
  }
}
