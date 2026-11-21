import { NextResponse } from "next/server";
import { authClient, currentAdmin, fail, slowDown } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const email = await currentAdmin();
  if (!email) return fail("Please sign in again.", 401);

  const body = await req.json().catch(() => null);
  const current = String(body?.current ?? "");
  const next = String(body?.next ?? "");
  if (next.length < 8) return fail("Use at least 8 characters for the new password.");
  if (next === current) return fail("The new password must be different.");

  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: current });
  if (error || !data.user) {
    await slowDown();
    return fail("Your current password is wrong.", 401);
  }
  const { error: updateError } = await client.auth.admin.updateUserById(data.user.id, { password: next });
  if (updateError) return fail(updateError.message || "Couldn't change the password.");
  return NextResponse.json({ status: "ok" });
}