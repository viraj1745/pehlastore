import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

const COOKIE = "ps_admin";
const WEEK = 7 * 24 * 60 * 60;

const secret = () => process.env.ADMIN_KEY ?? "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Optional: emails that are always admins (comma-separated ADMIN_EMAILS or ADMIN_EMAIL). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export const isAllowedEmail = (email?: string | null) => Boolean(email) && adminEmails().includes(String(email).toLowerCase());

/** An admin = a user created with the invite code (role "admin"), or an email on the admin list. */
export const isAdminUser = (user?: User | null) => Boolean(user) && (user?.app_metadata?.role === "admin" || isAllowedEmail(user?.email));

export const inviteCode = () => (process.env.ADMIN_INVITE_CODE ?? "").trim().toUpperCase();
export const checkInviteCode = (code: string) => Boolean(inviteCode()) && safeEqual(code.trim().toUpperCase(), inviteCode());
export const authConfigured = () => Boolean(secret());

/** Session = who + expiry + signature. Changing ADMIN_KEY signs everyone out. */
export function createSessionToken(email: string) {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const who = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${who}.${exp}.${sign(`admin:${who}:${exp}`)}`;
}

export function readSessionToken(token?: string | null): string | null {
  if (!token || !secret()) return null;
  const [who, exp, sig] = token.split(".");
  if (!who || !exp || !sig || Number(exp) < Date.now() / 1000) return null;
  if (!safeEqual(sig, sign(`admin:${who}:${exp}`))) return null;
  return Buffer.from(who, "base64url").toString();
}

export async function currentAdmin() {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE)?.value);
}
export async function isAdmin() {
  return Boolean(await currentAdmin());
}

export const sessionCookie = {
  name: COOKIE,
  options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: WEEK },
};

export function signedIn(email: string) {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set(sessionCookie.name, createSessionToken(email), sessionCookie.options);
  return res;
}

/** A fresh client per request, so a user sign-in never changes the shared database client. */
export function authClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const slowDown = () => new Promise((r) => setTimeout(r, 700));
export const fail = (message: string, status = 400) => NextResponse.json({ status: "error", message }, { status });