import { NextResponse } from "next/server";

export async function POST() {
  // The actual signout is handled by next-auth on the client side.
  // This route exists for audit logging / server-side cleanup.
  // The client calls signOut() from next-auth/react which hits
  // /api/auth/signout internally.
  return NextResponse.json({ success: true });
}
