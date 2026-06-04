import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { managerFirstName, managerLastName, managerEmail, managerPhone, facilityName, employmentStatus } = body;

    if (!managerFirstName || !managerLastName || !managerEmail || !facilityName || !employmentStatus) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const reference = await db.candidateReference.create({
      data: {
        candidate_user_id: userId,
        manager_email: managerEmail,
        manager_phone: managerPhone || "",
        facility_name: facilityName,
        employment_status: employmentStatus,
        status: "pending_request",
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        user_id: userId,
        message: `Reference request sent to ${managerFirstName} ${managerLastName} at ${facilityName}`,
        type: "reference_requested",
        related_entity_id: reference.id,
      },
    });

    return NextResponse.json(
      { message: "Reference request sent successfully", reference },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reference request error:", error);
    return NextResponse.json(
      { error: "Failed to send reference request" },
      { status: 500 }
    );
  }
}
