const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
export type GeminiErrorKind = "timeout" | "busy" | "blocked" | "bad_output" | "config" | "failed";

export class GeminiError extends Error {
  kind: GeminiErrorKind;
  constructor(message: string, kind: GeminiErrorKind) {
    super(message);
    this.name = "GeminiError";
    this.kind = kind;
  }
}

type GeminiResponse = {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateJson(opts: {
  system: string;
  parts: GeminiPart[];
  schema: object;
  deadline: number;
  temperature?: number;
}): Promise<{ data: unknown; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set", "config");

  let lastError = new GeminiError("No model answered", "failed");

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = opts.deadline - Date.now();
      if (remaining < 5000) throw new GeminiError("Ran out of time", "timeout");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(25000, remaining - 1000));
      try {
        const res = await fetch(endpoint(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: opts.system }] },
            contents: [{ role: "user", parts: opts.parts }],
            generationConfig: {
              temperature: opts.temperature ?? 0.8,
              responseMimeType: "application/json",
              responseSchema: opts.schema,
            },
          }),
        });
        const body = (await res.json().catch(() => ({}))) as GeminiResponse;

        if ([429, 500, 503].includes(res.status)) {
          lastError = new GeminiError(`${model} busy (HTTP ${res.status})`, "busy");
          await sleep(700 * (attempt + 1));
          continue; // retry the same model once, then move to the backup
        }
        if (!res.ok) {
          lastError = new GeminiError(body.error?.message ?? `HTTP ${res.status}`, "failed");
          break; // try the backup model
        }

        const candidate = body.candidates?.[0];
        if (!candidate || candidate.finishReason === "SAFETY" || candidate.finishReason === "PROHIBITED_CONTENT") {
          const blocked = Boolean(body.promptFeedback?.blockReason) || Boolean(candidate);
          lastError = new GeminiError(blocked ? "Blocked by safety filter" : "Empty answer", blocked ? "blocked" : "bad_output");
          break;
        }

        const text = (candidate.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
        try {
          return { data: JSON.parse(text), model };
        } catch {
          lastError = new GeminiError("Model returned invalid JSON", "bad_output");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          lastError = new GeminiError(`${model} timed out`, "timeout");
          break; // a slow model won't be faster on retry: go to the backup
        }
        lastError = new GeminiError((error as Error).message, "failed");
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw lastError;
}