import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { passwordSchema, validateBody } from "@/lib/validation-schemas";

// Reuse check: disallow setting the new password to the current password.
// NIST 800-63B 5.1.1.2 recommends blocking reuse of recently-used passwords;
// blocking the immediate previous password is the minimum bar.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json();

    // ── Zod validation (enforces 8–128 chars + upper + lower + digit) ──
    const validation = validateBody(changePasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { currentPassword, newPassword } = validation.data;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await compare(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // ── Password reuse check ──
    // Reject if the new password matches the current one.
    const isSameAsCurrent = await compare(newPassword, user.password_hash);
    if (isSameAsCurrent) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12);

    // Update password
    await db.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CANDIDATE_CHANGE_PASSWORD]", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
