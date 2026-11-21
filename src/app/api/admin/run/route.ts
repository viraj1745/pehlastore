import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { loadAdminData } from "@/lib/admin-data";
import { SpecSchema, runSpec } from "@/lib/admin-query";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ status: "error", message: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = SpecSchema.safeParse(body?.spec);
  if (!parsed.success) return NextResponse.json({ status: "error", message: "Invalid view." }, { status: 400 });
  const data = await loadAdminData();
  return NextResponse.json({ status: "ok", results: runSpec(parsed.data, data) });
}