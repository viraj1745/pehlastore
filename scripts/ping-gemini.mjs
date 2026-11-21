// Checks which Gemini models answer, and how fast. Run: node scripts/ping-gemini.mjs
import { readFileSync } from "node:fs";

const key = readFileSync(".env.local", "utf8").match(/GEMINI_API_KEY=(.*)/)?.[1]?.trim();
if (!key) {
  console.log("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}
const base = "https://generativelanguage.googleapis.com/v1beta";

const list = await (await fetch(`${base}/models?pageSize=200`, { headers: { "x-goog-api-key": key } })).json();
const flash = (list.models ?? [])
  .map((m) => m.name.replace("models/", ""))
  .filter((n) => n.includes("flash") && !/image|tts|audio|live|embed/.test(n));
console.log("Flash models available to this key:\n  " + flash.join("\n  ") + "\n");

async function ping(model, generationConfig = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${base}/models/${model}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with just: OK" }] }], generationConfig }),
    });
    const body = await res.json().catch(() => ({}));
    return `HTTP ${res.status} in ${Date.now() - started}ms ${res.ok ? "" : (body.error?.message ?? "").slice(0, 90)}`;
  } catch (error) {
    return `${error.name} after ${Date.now() - started}ms`;
  } finally {
    clearTimeout(timer);
  }
}

for (const model of flash.slice(0, 8)) console.log(`${model.padEnd(42)} ${await ping(model)}`);
console.log(`\nlite + thinkingLevel=minimal: ${await ping("gemini-flash-lite-latest", { thinkingConfig: { thinkingLevel: "minimal" } })}`);