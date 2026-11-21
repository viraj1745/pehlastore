"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VoiceRecorder, { type VoiceNote } from "@/components/VoiceRecorder";
import ScreenshotPicker, { type Screenshot } from "@/components/ScreenshotPicker";
import { FOLLOWER_TIERS, LANGUAGES, type FollowerTier, type Language } from "@/lib/types";
import { getSessionId, loadDraft, loadInput, saveDraft, saveInput } from "@/lib/client/storage";
import { trackEvent } from "@/lib/client/track";
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

const TIPS = [
  "A free resource is the easiest first “yes” from your followers.",
  "Prices ending in 99 feel familiar to Indian buyers.",
  "Your Auto-DM keyword turns Reel comments into store visits.",
  "Start with one product your audience already asks about in DMs.",
];

const STEPS = ["about", "instagram", "audience"] as const;
type Screen = "welcome" | (typeof STEPS)[number];
type Notice = { kind: "question" | "error"; text: string };

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [followers, setFollowers] = useState<FollowerTier>("unknown");
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [tip, setTip] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ready, setReady] = useState(false);
  const [draftName, setDraftName] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadInput();
    if (saved) {
      setHandle(saved.handle ?? "");
      setDescription(saved.description ?? "");
      setLanguage(saved.language ?? "en");
      setFollowers(saved.followers ?? "unknown");
    }
    const existing = loadDraft();
    if (existing) setDraftName(existing.store.display_name);
    trackEvent("home_viewed");
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveInput({ handle, description, language, followers });
  }, [ready, handle, description, language, followers]);

  useEffect(() => {
    if (notice?.kind !== "question") return;
    const id = setTimeout(() => textRef.current?.focus(), 450);
    return () => clearTimeout(id);
  }, [notice]);

  const loadingSteps = [
    ...(voice ? ["Listening to your voice note"] : []),
    ...(shots.length ? ["Reading your Instagram screenshots"] : []),
    "Finding products your audience would buy",
    "Pricing them for Indian buyers",
    "Writing your page and launch kit",
  ];

  useEffect(() => {
    if (!loading) return;
    const a = setInterval(() => setStep((s) => Math.min(s + 1, loadingSteps.length - 1)), 2200);
    const b = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3500);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [loading, loadingSteps.length]);

  const hasAbout = Boolean(voice || description.trim());
  const canSubmit = Boolean(handle.trim() || description.trim() || voice || shots.length);
  const stepIndex = (STEPS as readonly string[]).indexOf(screen);

  function go(next: Screen, direction: "fwd" | "back" = "fwd") {
    setDir(direction);
    setScreen(next);
    window.scrollTo({ top: 0 });
  }

  function useExample(example: (typeof EXAMPLES)[number]) {
    trackEvent("example_used", { label: example.label });
    setHandle(example.handle);
    setDescription(example.description);
    setLanguage(example.language);
    setFollowers(example.followers);
    setNotice(null);
    go("audience");
  }

  async function generate() {
    setNotice(null);
    const payload = JSON.stringify({
      sessionId: getSessionId(),
      handle,
      description,
      language,
      followers,
      images: shots.map((s) => ({ mimeType: s.mimeType, data: s.data })),
      audio: voice ? { mimeType: voice.mimeType, data: voice.data } : null,
    });
    if (payload.length > 4_200_000) {
      setNotice({ kind: "error", text: "That's too much to upload at once. Remove a screenshot or record a shorter voice note." });
      return;
    }

    setStep(0);
    setTip(0);
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
        go("about", "back");
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

  if (loading) return <Generating steps={loadingSteps} current={step} tip={tip} />;

  const summary = <Summary voice={voice} description={description} shots={shots.length} handle={handle} canSubmit={canSubmit} />;

  const stepFooter = (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[#fffbf2]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <div className="mx-auto max-w-md lg:mx-0 lg:max-w-sm">
        {screen === "about" && (
          <PrimaryButton onClick={() => go("instagram")}>{hasAbout ? "Next →" : "Skip, I'll add screenshots →"}</PrimaryButton>
        )}
        {screen === "instagram" && (
          <PrimaryButton onClick={() => go("audience")}>{handle.trim() || shots.length ? "Next →" : "Skip this step →"}</PrimaryButton>
        )}
        {screen === "audience" && (
          <PrimaryButton onClick={generate} disabled={!canSubmit}>
            ✨ Create my store
          </PrimaryButton>
        )}
        <p className="mt-1.5 text-center text-xs text-stone-500 lg:text-left">Free · No sign-up · You can edit everything after</p>
      </div>
    </div>
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-40 pt-5 lg:max-w-6xl lg:px-10 lg:pb-16">
      <header className="flex h-9 items-center justify-between">
        {screen === "welcome" ? (
          <span className="text-lg font-extrabold tracking-tight lg:text-xl">
            Pehla<span className="text-orange-600">Store</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => go(stepIndex === 0 ? "welcome" : STEPS[stepIndex - 1], "back")}
            className="press rounded-full bg-white px-3.5 py-1.5 text-sm font-medium shadow-sm"
          >
            ← Back
          </button>
        )}
        {screen === "welcome" ? (
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-800">For first-time creators</span>
        ) : (
          <span className="text-xs font-semibold text-stone-500">Step {stepIndex + 1} of 3</span>
        )}
      </header>

      {screen === "welcome" ? (
        <div key="welcome" className={dir === "fwd" ? "anim-slide-right" : "anim-slide-left"}>
          <Welcome draftName={draftName} onExample={useExample} onStart={() => go("about")} />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[#fffbf2]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
            <div className="mx-auto max-w-md">
              <PrimaryButton onClick={() => go("about")}>🎙️ Let&apos;s start</PrimaryButton>
              <p className="mt-1.5 text-center text-xs text-stone-500">Free · No sign-up · You can edit everything after</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-16">
          <div className="lg:max-w-xl">
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 lg:mt-0">
              <div className="h-full rounded-full bg-orange-600 transition-all duration-500" style={{ width: `${((stepIndex + 1) / 3) * 100}%` }} />
            </div>

            <div key={screen} className={dir === "fwd" ? "anim-slide-right" : "anim-slide-left"}>
              {screen === "about" && (
                <section className="mt-7">
                  <h1 className="text-[1.7rem] font-extrabold leading-tight lg:text-4xl">Tell us about you</h1>
                  <p className="mt-1.5 text-stone-600 lg:text-lg">What do you post, and who follows you? Say it like you&apos;d explain it to a friend.</p>

                  {notice?.kind === "question" && (
                    <div className="anim-pop mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">🤔 One quick question</p>
                      <p className="mt-1">{notice.text}</p>
                    </div>
                  )}

                  <div className="mt-6">
                    <VoiceRecorder value={voice} onChange={setVoice} />
                  </div>
                  <div className="my-4 flex items-center gap-3 text-xs text-stone-400">
                    <span className="h-px flex-1 bg-stone-200" /> or type <span className="h-px flex-1 bg-stone-200" />
                  </div>
                  <textarea
                    ref={textRef}
                    rows={5}
                    maxLength={1500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. I share easy Bengali home recipes. Most followers are young working couples who want quick dinners."
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                  <p className="mt-1 text-right text-xs text-stone-400">{description.length}/1500</p>
                </section>
              )}

              {screen === "instagram" && (
                <section className="mt-7">
                  <h1 className="text-[1.7rem] font-extrabold leading-tight lg:text-4xl">Your Instagram</h1>
                  <p className="mt-1.5 text-stone-600 lg:text-lg">Optional, but screenshots make your store sound like you.</p>

                  <label className="mt-6 block text-sm font-semibold text-stone-700">Handle</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-stone-300 bg-white px-4 transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
                    <span className="text-stone-400">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="yourhandle"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full bg-transparent px-1 py-3 text-base outline-none"
                    />
                  </div>

                  <p className="mt-6 text-sm font-semibold text-stone-700">Screenshots of your profile or top posts (up to 3)</p>
                  <div className="mt-2">
                    <ScreenshotPicker value={shots} onChange={setShots} />
                  </div>

                  <div className="mt-6 flex gap-3 rounded-2xl bg-white p-4 text-sm text-stone-600 shadow-sm">
                    <span className="text-xl">🔒</span>
                    <p>
                      We never log in to Instagram. Screenshots let the AI read your real bio, follower count and content, and stay on this device until
                      you create your store.
                    </p>
                  </div>
                </section>
              )}

              {screen === "audience" && (
                <section className="mt-7">
                  <h1 className="text-[1.7rem] font-extrabold leading-tight lg:text-4xl">Your audience</h1>
                  <p className="mt-1.5 text-stone-600 lg:text-lg">This helps us price your products right.</p>

                  <p className="mt-6 text-sm font-semibold text-stone-700">Followers</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {FOLLOWER_TIERS.map((f) => (
                      <Chip key={f} active={followers === f} onClick={() => setFollowers(f)}>
                        {FOLLOWER_CHIPS[f]}
                      </Chip>
                    ))}
                  </div>

                  <p className="mt-6 text-sm font-semibold text-stone-700">Store language</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {LANGUAGES.map((l) => (
                      <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>
                        {LANGUAGE_CHIPS[l]}
                      </Chip>
                    ))}
                  </div>

                  <div className="mt-6 lg:hidden">{summary}</div>

                  {notice?.kind === "error" && (
                    <div className="anim-pop mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <p className="font-semibold">⚠️ That didn&apos;t work</p>
                      <p className="mt-1">{notice.text}</p>
                      <button type="button" onClick={generate} className="press mt-3 rounded-full bg-red-600 px-4 py-2 font-semibold text-white">
                        Try again
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>

            {stepFooter}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="flex justify-center">
                <PhoneMockup />
              </div>
              {summary}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function Summary({
  voice,
  description,
  shots,
  handle,
  canSubmit,
}: {
  voice: VoiceNote | null;
  description: string;
  shots: number;
  handle: string;
  canSubmit: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-bold">We&apos;ll build your store from</p>
      <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
        {voice && <li>🎙️ Voice note · {voice.seconds}s</li>}
        {description.trim() && <li className="line-clamp-2">✍️ “{description.trim()}”</li>}
        {shots > 0 && <li>📸 {shots} screenshot{shots > 1 ? "s" : ""}</li>}
        {handle.trim() && <li>📱 @{cleanHandle(handle)}</li>}
        {!canSubmit && <li className="text-stone-500">Nothing yet. Add a voice note, a few lines or screenshots.</li>}
      </ul>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press w-full rounded-full bg-orange-600 py-4 text-lg font-bold text-white shadow-lg shadow-orange-600/25 disabled:bg-stone-300 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`press rounded-2xl border px-2 py-3 text-sm transition ${
        active ? "anim-pop border-orange-600 bg-orange-600 font-semibold text-white shadow-md shadow-orange-600/25" : "border-stone-300 bg-white text-stone-700"
      }`}
    >
      {children}
    </button>
  );
}

function Welcome({
  draftName,
  onExample,
  onStart,
}: {
  draftName: string;
  onExample: (example: (typeof EXAMPLES)[number]) => void;
  onStart: () => void;
}) {
  return (
    <section className="mt-4 lg:mt-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
      <div className="relative mt-6 flex justify-center lg:order-2 lg:mt-0 lg:py-20">
        <div className="lg:scale-125">
          <PhoneMockup />
        </div>
        <span className="anim-float absolute left-0 top-8 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-lg lg:left-4 lg:top-16 lg:text-sm">
          🎙️ Speak in Hinglish
        </span>
        <span className="anim-float delay-3 absolute bottom-10 right-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-lg lg:bottom-20 lg:right-4 lg:text-sm">
          ₹ Priced for India
        </span>
      </div>

      <div className="lg:order-1">
        {draftName && (
          <Link
            href="/edit"
            className="anim-fade-up press mt-6 flex items-center justify-between rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm shadow-sm lg:mt-0 lg:max-w-lg"
          >
            <span>
              Continue editing <b>{draftName}</b>&apos;s store
            </span>
            <span className="font-semibold text-orange-700">Open →</span>
          </Link>
        )}

        <h1 className="anim-fade-up mt-8 text-[2rem] font-extrabold leading-tight lg:mt-8 lg:text-6xl lg:leading-[1.05]">
          Your first store,
          <br />
          <span className="text-orange-600">ready in 2 minutes.</span>
        </h1>
        <p className="anim-fade-up delay-1 mt-3 text-stone-600 lg:mt-5 lg:max-w-lg lg:text-lg">
          Speak for 30 seconds or drop your Instagram screenshots. We&apos;ll suggest what to sell, price it for Indian buyers and write your page.
        </p>

        <div className="anim-fade-up delay-2 mt-5 grid grid-cols-3 gap-2 text-center text-xs lg:max-w-lg lg:text-sm">
          {[
            ["🎁", "A free lead magnet"],
            ["🧪", "See what sells first"],
            ["📣", "Auto-DM launch kit"],
          ].map(([icon, label]) => (
            <div key={label} className="rounded-2xl bg-white px-2 py-3 shadow-sm">
              <p className="text-xl">{icon}</p>
              <p className="mt-1 font-medium text-stone-700">{label}</p>
            </div>
          ))}
        </div>

        <div className="anim-fade-up delay-3 mt-8 hidden lg:block">
          <button
            type="button"
            onClick={onStart}
            className="press rounded-full bg-orange-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-orange-600/25"
          >
            🎙️ Let&apos;s start
          </button>
          <p className="mt-2 text-sm text-stone-500">Free · No sign-up · You can edit everything after</p>
        </div>

        <p className="anim-fade-up delay-3 mt-7 text-xs font-semibold uppercase tracking-wide text-stone-500">Just exploring? Try an example</p>
        <div className="anim-fade-up delay-4 no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => onExample(example)}
              className="press shrink-0 rounded-full border border-stone-300 bg-white px-3.5 py-2 text-sm"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  const items: Array<[string, string, string]> = [
    ["Free lead magnet", "7-Day Workout Checklist", "Free"],
    ["Digital product", "21-Day Home Workout Plan", "₹299"],
    ["1:1 session", "Personal Fitness Call", "₹999"],
  ];
  return (
    <div className="anim-fade-up w-52 rounded-[2.2rem] border-[7px] border-stone-900 bg-linear-to-b from-orange-50 to-white p-3 shadow-2xl">
      <div className="mx-auto h-11 w-11 rounded-full bg-orange-600 text-center text-lg font-bold leading-[2.75rem] text-white">P</div>
      <p className="mt-1.5 text-center text-xs font-bold">Priya</p>
      <p className="text-center text-[10px] text-stone-500">15-min workouts for working women</p>
      <div className="mt-2 space-y-1.5">
        {items.map(([type, title, price], i) => (
          <div key={title} className={`anim-fade-up delay-${i + 2} rounded-xl bg-white p-2 shadow-sm ${i === 0 ? "ring-1 ring-orange-300" : ""}`}>
            <p className="text-[9px] font-semibold text-orange-700">{type}</p>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold">{title}</p>
              <p className="text-[10px] font-extrabold">{price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Generating({ steps, current, tip }: { steps: string[]; current: number; tip: number }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pt-10 lg:max-w-5xl lg:flex-row lg:items-center lg:justify-center lg:gap-24 lg:pt-0">
      <div className="relative lg:scale-125">
        <div className="h-80 w-52 rounded-[2.2rem] border-[7px] border-stone-900 bg-white p-3 shadow-2xl">
          <div className="shimmer mx-auto h-11 w-11 rounded-full" />
          <div className="shimmer mx-auto mt-2.5 h-3 w-24 rounded-full" />
          <div className="shimmer mx-auto mt-1.5 h-2.5 w-32 rounded-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer mt-3 h-14 rounded-xl" />
          ))}
        </div>
        <span className="anim-float absolute -right-6 top-8 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white shadow-lg">AI at work ✨</span>
      </div>

      <div className="flex w-full flex-col items-center lg:w-96 lg:items-start">
        <h2 className="mt-8 text-xl font-bold lg:mt-0 lg:text-3xl">Building your store…</h2>
        <p className="text-sm text-stone-500">Usually 15-20 seconds</p>

        <ol className="mt-5 w-full space-y-2">
          {steps.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                i < current ? "text-stone-500" : i === current ? "bg-white font-semibold shadow-sm" : "text-stone-300"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  i < current ? "anim-pop bg-emerald-500 text-white" : i === current ? "anim-pulse-ring bg-orange-600" : "bg-stone-200"
                }`}
              >
                {i < current ? "✓" : ""}
              </span>
              {label}
            </li>
          ))}
        </ol>

        <p key={tip} className="anim-fade-up mt-6 w-full rounded-2xl bg-orange-50 px-4 py-3 text-center text-sm text-orange-900 lg:text-left">
          💡 {TIPS[tip]}
        </p>
      </div>
    </main>
  );
}