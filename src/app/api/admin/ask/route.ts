import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { describeData, istDay, loadAdminData } from "@/lib/admin-data";
import { SpecSchema, runSpec } from "@/lib/admin-query";
import { askGeminiJson, buildDashboardPrompt } from "@/lib/admin-ai";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ status: "error", message: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim().slice(0, 400);
  if (question.length < 3) return NextResponse.json({ status: "error", message: "Type a question first." }, { status: 400 });

  const data = await loadAdminData();
  const prompt = buildDashboardPrompt(question, describeData(data), istDay(new Date().toISOString()));

  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await askGeminiJson(attempt === 0 ? prompt : `${prompt}\n\nYour last answer was invalid (${problem}). Return valid JSON in the exact shape.`);
      const parsed = SpecSchema.safeParse(raw);
      if (!parsed.success) {
        problem = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        continue;
      }
      return NextResponse.json({ status: "ok", spec: parsed.data, results: runSpec(parsed.data, data) });
    } catch (e) {
      problem = (e as Error).message;
      if (problem === "AI_BUSY") break;
    }
  }
  const message = problem === "AI_BUSY" ? "The AI is busy right now. Please try again in a minute." : "The AI couldn't build that view. Try rephrasing it.";
  return NextResponse.json({ status: "error", message }, { status: 502 });
}