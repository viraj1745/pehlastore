import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/admin-auth";

export async function POST() {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 });
  return res;
}