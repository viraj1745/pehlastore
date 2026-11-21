import { authClient, authConfigured, checkInviteCode, fail, inviteCode, signedIn, slowDown } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!authConfigured() || !inviteCode()) {
    return fail("Sign-up isn't enabled. Add ADMIN_INVITE_CODE and ADMIN_KEY to the environment variables.", 500);
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 60);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const code = String(body?.code ?? "");

  if (!name) return fail("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email.");
  if (password.length < 8) return fail("Use at least 8 characters for the password.");
  if (!checkInviteCode(code)) {
    await slowDown();
    return fail("That invite code isn't right.", 403);
  }

  // Created already confirmed, so no confirmation email is needed.
  const { error } = await authClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { name },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return fail(exists ? "An account with this email already exists. Sign in, or reset your password." : error.message || "Couldn't create the account.", exists ? 409 : 400);
  }
  return signedIn(email);
}