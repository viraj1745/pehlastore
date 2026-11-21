const MODELS = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3-flash-preview"];
const TIMEOUTS = [15000, 18000, 20000];

async function call(model: string, prompt: string, timeout: number, thinking: boolean) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        ...(thinking ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
      },
    }),
    signal: AbortSignal.timeout(timeout),
  });
}

/** Returns parsed JSON from the first healthy model. Throws AI_BUSY if every model is overloaded. */
export async function askGeminiJson(prompt: string): Promise<unknown> {
  for (let i = 0; i < MODELS.length; i++) {
    try {
      let res = await call(MODELS[i], prompt, TIMEOUTS[i], true);
      if (res.status === 400) res = await call(MODELS[i], prompt, TIMEOUTS[i], false);
      if ([404, 429, 500, 503].includes(res.status)) continue;
      if (!res.ok) throw new Error(`AI error ${res.status}`);
      const data = await res.json();
      const text: string = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
    } catch (e) {
      const name = (e as Error).name;
      if (name === "TimeoutError" || name === "AbortError") continue;
      throw e;
    }
  }
  throw new Error("AI_BUSY");
}

export function buildDashboardPrompt(question: string, catalog: string, today: string) {
  return `You are a product analytics assistant for PehlaStore, where Indian creators turn a voice note or description into a store.
Turn the admin's question into a small dashboard plan. You never calculate numbers yourself: the server computes every number from the plan.

DATA (datasets, fields, real example values):
${catalog}

Today (IST): ${today}

RETURN JSON ONLY in this shape:
{"title": string, "summary": "one or two plain sentences on what this shows and any caveat", "widgets": [1 to 4 widgets]}

Widget:
{"type": "number"|"bar"|"line"|"table", "title": string, "dataset": "events"|"stores"|"store_events",
 "filters": [{"field": string, "op": "eq"|"neq"|"in"|"contains"|"gte"|"lte"|"exists", "value": any}],
 "group_by": field or null, "metric": "count"|"unique_sessions"|"sum"|"avg"|"median"|"p90"|"rate",
 "metric_field": number field or null, "rate_filters": [filters], "sort": "desc"|"asc"|"key", "limit": 1-60, "columns": [fields for a raw table]}

RULES
- Use only fields listed for the chosen dataset, and only event names that appear in the example values.
- Trend over time: type "line", group_by "day", limit 14 (or the number of days asked).
- Breakdown or ranking: type "bar" with group_by.
- One headline number: type "number", group_by null.
- Rates such as publish rate: metric "rate". "filters" choose the base rows, "rate_filters" choose the successes. On events, rates count unique sessions (so publish rate = rate_filters [event eq published] with no base filter).
- Time windows: filter "day" with gte/lte and YYYY-MM-DD dates.
- Funnel: a "bar" on events, filter event in [home_viewed, generate_started, generated, published, link_shared], group_by "event", metric "unique_sessions".
- Event properties exist only on specific events (see notes): filter to that event when you use them.
- Speed questions: metric "median" or "p90" with metric_field "ms" on event "generated".
- Usually return 2 or 3 widgets: one headline number and one chart. Short, plain titles.

QUESTION: ${question}`;
}