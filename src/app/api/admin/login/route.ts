import { authClient, authConfigured, fail, isAdminUser, signedIn, slowDown } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!authConfigured()) return fail("Admin sign-in isn't set up. Add ADMIN_KEY to the environment variables.", 500);

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email.includes("@") || !password) return fail("Enter your email and password.");

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await slowDown();
    return fail("Wrong email or password.", 401);
  }
  if (!isAdminUser(data.user)) {
    await slowDown();
    return fail("This account doesn't have admin access.", 403);
  }
  return signedIn(email);
}