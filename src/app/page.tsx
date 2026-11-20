"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VoiceRecorder, { type VoiceNote } from "@/components/VoiceRecorder";
import ScreenshotPicker, { type Screenshot } from "@/components/ScreenshotPicker";
import { FOLLOWER_TIERS, LANGUAGES, type FollowerTier, type Language } from "@/lib/types";
import { getSessionId, loadInput, saveDraft, saveInput } from "@/lib/client/storage";
import { cleanHandle } from "@/lib/format";

const LANGUAGE_CHIPS: Record<Language, string> = { en: "English", hinglish: "Hinglish", hi: "हिंदी" };
const FOLLOWER_CHIPS: Record<FollowerTier, string> = {
  under_5k: "Under 5K",
  "5k_20k": "5K–20K",
  "20k_50k": "20K–50K",
  "50k_100k": "50K–100K",
  "100k_plus": "100K+",
  unknown: "Not sure",
};

const EXAMPLES: Array<{ label: string; handle: string; description: string; language: Language; followers: FollowerTier }> = [
  {
    label: "🏋️ Fitness · Hinglish",
    handle: "fitwithpriya",
    description:
      "I'm Priya. I post quick 15-minute home workouts for working women, mostly in Hinglish. Lots of DMs ask me for a weekly plan and diet tips.",
    language: "hinglish",
    followers: "5k_20k",
  },
  {
    label: "💰 Finance · English",
    handle: "paisawithrohan",
    description:
      "I'm Rohan, a CA. I explain budgeting, tax saving and SIP basics for first-jobbers in simple English reels. Most followers are 22-28 years old.",
    language: "en",
    followers: "20k_50k",
  },
  {
    label: "🔮 Astrology · हिंदी",
    handle: "jyotish_with_meera",
    description:
      "मैं मीरा हूँ। Instagram पर रोज़ राशिफल और रिलेशनशिप से जुड़ी ज्योतिष टिप्स शेयर करती हूँ। लोग अक्सर पर्सनल कुंडली रीडिंग के लिए मैसेज करते हैं।",
    language: "hi",
    followers: "5k_20k",
  },
];

type Notice = { kind: "question" | "error"; text: string };

export default function Home() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [followers, setFollowers] = useState<FollowerTier>("unknown");
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ready, setReady] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  // Restore what the creator typed last time
  useEffect(() => {
    const saved = loadInput();
    if (saved) {
      setHandle(saved.handle ?? "");
      setDescription(saved.description ?? "");
      setLanguage(saved.language ?? "en");
      setFollowers(saved.followers ?? "unknown");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveInput({ handle, description, language, followers });
  }, [ready, handle, description, language, followers]);

  useEffect(() => {
    if (!notice) return;
    noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (notice.kind === "question") textRef.current?.focus();
  }, [notice]);

  const steps = [
    ...(voice ? ["Listening to your voice note"] : []),
    ...(shots.length ? ["Reading your Instagram screenshots"] : []),
    "Finding products your audience would buy",
    "Pricing them for Indian buyers",
    "Writing your page and launch kit",
  ];

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 2200);
    return () => clearInterval(id);
  }, [loading, steps.length]);

  const canSubmit = Boolean(handle.trim() || description.trim() || voice || shots.length);

  function useExample(example: (typeof EXAMPLES)[number]) {
    setHandle(example.handle);
    setDescription(example.description);
    setLanguage(example.language);
    setFollowers(example.followers);
    setNotice(null);
  }

  async function generate() {
    setNotice(null);
    const body = {
      sessionId: getSessionId(),
      handle,
      description,
      language,
      followers,
      images: shots.map((s) => ({ mimeType: s.mimeType, data: s.data })),
      audio: voice ? { mimeType: voice.mimeType, data: voice.data } : null,
    };
    const payload = JSON.stringify(body);
    if (payload.length > 4_200_000) {
      setNotice({ kind: "error", text: "That's too much to upload at once. Remove a screenshot or record a shorter voice note." });
      return;
    }

    setStep(0);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 65_000);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => null);

      if (data?.status === "ok") {
        saveDraft({
          input: { handle: cleanHandle(handle), description, language, followers },
          store: data.store,
          meta: data.meta,
          theme: "sunrise",
          savedAt: new Date().toISOString(),
        });
        router.push("/edit");
        return;
      }
      if (data?.status === "needs_more") {
        setNotice({ kind: "question", text: data.question });
      } else {
        setNotice({ kind: "error", text: data?.message ?? "Something went wrong. Please try again." });
      }
    } catch {
      setNotice({
        kind: "error",
        text: "Your connection dropped or the AI took too long. Everything you entered is still here. Tap Try again.",
      });
    }
    setLoading(false);
  }

  if (loading) return <Generating steps={steps} current={step} />;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-36 pt-6">
      <header className="flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-tight">
          Pehla<span className="text-orange-600">Store</span>
        </span>
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-800">
          For first-time creators
        </span>
      </header>

      <section className="mt-8">
        <h1 className="text-3xl font-extrabold leading-tight">
          Your first store,
          <br />
          ready in 2 minutes.
        </h1>
        <p className="mt-3 text-stone-600">
          Speak, type, or drop your Instagram screenshots. We&apos;ll suggest what to sell, price it for Indian buyers and write
          your page.
        </p>
      </section>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Just exploring? Try an example</p>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => useExample(example)}
              className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          ref={noticeRef}
          className={`mt-5 rounded-2xl border p-4 text-sm ${
            notice.kind === "question" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">{notice.kind === "question" ? "🤔 One quick question" : "⚠️ That didn't work"}</p>
          <p className="mt-1">{notice.text}</p>
          {notice.kind === "error" && (
            <button type="button" onClick={generate} className="mt-3 rounded-full bg-red-600 px-4 py-2 font-semibold text-white">
              Try again
            </button>
          )}
        </div>
      )}

      <Card title="Tell us about you" hint="Speak or type. What do you post, and who follows you?">
        <VoiceRecorder value={voice} onChange={setVoice} />
        <div className="my-3 flex items-center gap-3 text-xs text-stone-400">
          <span className="h-px flex-1 bg-stone-200" /> or type <span className="h-px flex-1 bg-stone-200" />
        </div>
        <textarea
          ref={textRef}
          rows={4}
          maxLength={1500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. I share easy Bengali home recipes. Most followers are young working couples who want quick dinners."
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
      </Card>

      <Card title="Your Instagram" hint="Optional, but screenshots make your store much more personal.">
        <div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200">
          <span className="text-stone-400">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourhandle"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-transparent px-1 py-2.5 text-base outline-none"
          />
        </div>
        <p className="mt-3 text-sm font-medium text-stone-700">Add 1–3 screenshots of your profile or top posts</p>
        <p className="mb-2 text-xs text-stone-500">
          We don&apos;t log in to Instagram. Screenshots let the AI read your real bio, follower count and content.
        </p>
        <ScreenshotPicker value={shots} onChange={setShots} />
      </Card>

      <Card title="Your audience">
        <p className="text-sm font-medium text-stone-700">Store language</p>
        <ChipRow>
          {LANGUAGES.map((l) => (
            <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>
              {LANGUAGE_CHIPS[l]}
            </Chip>
          ))}
        </ChipRow>
        <p className="mt-4 text-sm font-medium text-stone-700">Followers</p>
        <ChipRow>
          {FOLLOWER_TIERS.map((f) => (
            <Chip key={f} active={followers === f} onClick={() => setFollowers(f)}>
              {FOLLOWER_CHIPS[f]}
            </Chip>
          ))}
        </ChipRow>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[#fffbf2]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={generate}
            disabled={!canSubmit}
            className="w-full rounded-full bg-orange-600 py-4 text-lg font-bold text-white shadow-lg transition active:scale-[0.99] disabled:bg-stone-300 disabled:shadow-none"
          >
            ✨ Create my store
          </button>
          <p className="mt-1.5 text-center text-xs text-stone-500">Free · No sign-up · You can edit everything after</p>
        </div>
      </div>
    </main>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-sm">
      <h2 className="text-base font-bold">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-sm text-stone-500">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </section>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-2">{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? "border-orange-600 bg-orange-600 font-semibold text-white" : "border-stone-300 bg-white text-stone-700"
      }`}
    >
      {children}
    </button>
  );
}

function Generating({ steps, current }: { steps: string[]; current: number }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-16">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
        <h2 className="mt-6 text-xl font-bold">Building your store…</h2>
        <p className="mt-1 text-sm text-stone-500">Usually takes 5–15 seconds</p>
      </div>
      <ol className="mt-8 space-y-3">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-3 text-sm ${
              i < current ? "text-stone-500" : i === current ? "font-semibold text-stone-900" : "text-stone-300"
            }`}
          >
            <span className="w-4 text-center">{i < current ? "✓" : i === current ? "●" : "○"}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200/70" />
        ))}
      </div>
    </main>
  );
}