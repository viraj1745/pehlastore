import { NextResponse } from "next/server";
import { authClient, authConfigured, fail, isAdminUser, signedIn, slowDown } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!authConfigured()) return fail("Admin sign-in isn't set up.", 500);
  const body = await req.json().catch(() => null);

  // Step 1: email a password-reset link (Supabase's default template).
  if (body?.action === "send") {
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (email.includes("@")) {
      const origin = new URL(req.url).origin;
      const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${origin}/admin/reset` });
      if (error?.status === 429) return fail("Too many emails requested. Please wait a few minutes.", 429);
      if (error) console.error("[admin reset send]", error.message);
    }
    // Same answer either way, so nobody can find out which emails have accounts.
    return NextResponse.json({ status: "ok", message: "If an account exists for that email, a reset link is on its way. Check your inbox and spam." });
  }

  // Step 2: the link lands on /admin/reset with a one-time token; set the new password.
  if (body?.action === "set") {
    const accessToken = String(body?.accessToken ?? "");
    const password = String(body?.password ?? "");
    if (password.length < 8) return fail("Use at least 8 characters.");
    const client = authClient();
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user || !isAdminUser(data.user)) {
      await slowDown();
      return fail("This reset link didn't work or has expired. Request a new one.", 401);
    }
    const { error: updateError } = await client.auth.admin.updateUserById(data.user.id, { password });
    if (updateError) return fail(updateError.message || "Couldn't save the new password.");
    return signedIn(data.user.email ?? "");
  }

  return fail("Unknown action.");
}