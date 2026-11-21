import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What is PehlaStore?",
  description: "Turn a 60-second voice note in English, Hinglish or Hindi into a ready-to-publish creator store with products, INR prices and launch posts.",
};

const PROBLEMS = [
  { icon: "📄", title: "The blank page", text: "Creators know their audience, but not what to sell. Most store builders start with an empty form." },
  { icon: "🏷️", title: "Price guesswork", text: "₹99 or ₹999? Without a reference point, creators underprice their work or scare buyers away." },
  { icon: "🗣️", title: "English-first tools", text: "Many creators think and talk in Hinglish or Hindi, but setup flows expect polished English copy." },
  { icon: "🔇", title: "Launch silence", text: "A store goes live and nobody hears about it. Writing the reel caption, DMs and WhatsApp message is another job." },
];

const STEPS = [
  { title: "Talk for 60 seconds", text: "Send a voice note, a few screenshots or a short description, in English, Hinglish or Hindi." },
  { title: "AI drafts your store", text: "A profile, a free lead magnet and 2–3 paid products on a rising INR price ladder, with a reason for every price." },
  { title: "Edit and publish", text: "Tap anything to edit or rewrite with AI. Add sections, choose a look, and publish a shareable link." },
  { title: "Launch and learn", text: "Get a reel caption, an Auto-DM keyword and a WhatsApp message, then see which product your audience taps first." },
];

const PRINCIPLES = [
  { title: "No invented promises", text: "AI copy is checked for income claims, guarantees and made-up results, and rewritten if it finds any." },
  { title: "Prices that fit India", text: "Every product type has an INR price band. Out-of-band prices are corrected and the change is explained." },
  { title: "Real social proof only", text: "Testimonials are never AI-written. Creators add real messages from their followers." },
  { title: "Demand before effort", text: "Taps on each product show what to build first, before a week goes into making a course." },
];

const FAQ = [
  {
    q: "Who is it for?",
    a: "Indian Instagram creators with a small or growing audience who want to sell their first digital product: fitness, finance, astrology, study tips, cooking and more.",
  },
  {
    q: "Does PehlaStore take payments?",
    a: "No. It drafts the store and tests demand. Each product can be copied into SuperProfile, which already handles checkout, Auto-DM and payouts.",
  },
  {
    q: "Does the AI write the final copy?",
    a: "It writes a first draft in your language. You stay in control: edit any section, rewrite with one tap, or undo.",
  },
  {
    q: "Is this an official SuperProfile product?",
    a: "No. It's an independent concept built for SuperProfile's AI Storefront Generator assignment.",
  },
];

export default function About() {
  return (
    <main className="relative overflow-hidden bg-[#fffbf2] text-stone-900">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-96 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold">
            Pehla<span className="text-orange-600">Store</span>
          </Link>
          <Link href="/" className="press rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
            Create my store
          </Link>
        </nav>

        {/* Hero */}
        <section className="grid items-center gap-10 pt-12 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
          <div>
            <p className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
              &quot;Pehla&quot; means first: your first store, in one step
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
              Turn your Instagram audience into your <span className="text-orange-600">first store</span>, in about a minute.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-600">
              Speak in English, Hinglish or Hindi. PehlaStore drafts your products, prices and launch posts. You edit, publish and share.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/" className="press rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-600/20">
                Create my store, free →
              </Link>
              <a href="#how" className="press rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold">
                How it works
              </a>
            </div>
          </div>

          {/* Example: input → output */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl bg-white p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">You say</p>
              <div className="mt-2 rounded-2xl rounded-tl-sm bg-emerald-50 p-3 text-sm text-emerald-900">
                🎙️ &quot;Main ghar pe workout sikhati hoon, mostly college girls aur working women ko…&quot;
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-400">PehlaStore drafts</p>
              <div className="mt-2 space-y-2">
                {[
                  ["Free", "7-day home workout starter plan", "₹0"],
                  ["Guide", "Fat-loss meal plan for busy days", "₹299"],
                  ["Live", "Weekend group workout session", "₹499"],
                  ["1:1", "4-week personal coaching", "₹1,099"],
                ].map(([tag, title, price]) => (
                  <div key={title} className="flex items-center gap-3 rounded-xl border border-stone-100 px-3 py-2.5">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">{tag}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                    <span className="text-sm font-bold">{price}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-xl bg-stone-900 px-3 py-2 text-xs text-white">+ reel caption · Auto-DM keyword · WhatsApp message</p>
            </div>
            <p className="mt-2 text-center text-xs text-stone-400">Example output</p>
          </div>
        </section>

        {/* Problem */}
        <section className="pt-20">
          <p className="text-sm font-bold uppercase tracking-wide text-orange-700">The problem</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight">
            Creators have an audience. What stops them is the first store.
          </h2>
          <p className="mt-3 max-w-2xl text-stone-600">
            Selling a guide, a live session or coaching is the natural next step for a creator. But between &quot;I should sell something&quot; and a
            published store sit four hard questions.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
                <p className="text-2xl">{p.icon}</p>
                <p className="mt-2 font-bold">{p.title}</p>
                <p className="mt-1 text-sm text-stone-600">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-6 pt-20">
          <p className="text-sm font-bold uppercase tracking-wide text-orange-700">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold">From a voice note to a live link</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 font-bold text-white">{i + 1}</span>
                <p className="mt-3 font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-stone-600">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="pt-20">
          <div className="rounded-3xl bg-stone-900 p-7 text-white lg:p-10">
            <p className="text-sm font-bold uppercase tracking-wide text-orange-400">How the AI is kept honest</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight">A creator&apos;s store carries their name. The AI has guardrails.</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <div key={p.title}>
                  <p className="font-bold">✓ {p.title}</p>
                  <p className="mt-1 text-sm text-stone-300">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pt-20">
          <h2 className="text-3xl font-extrabold">Questions</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-stone-200/70 bg-white px-5 py-4 shadow-sm">
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="mr-2 inline-block text-orange-600 transition group-open:rotate-45">+</span>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pt-20 text-center">
          <h2 className="text-3xl font-extrabold">Your audience is waiting for your first product.</h2>
          <p className="mt-2 text-stone-600">Talk for a minute. Get a store you can share today.</p>
          <Link href="/" className="press mt-6 inline-block rounded-full bg-orange-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-orange-600/20">
            Create my store →
          </Link>
          <p className="mt-10 text-xs text-stone-400">An independent concept built for SuperProfile&apos;s AI Storefront assignment.</p>
        </section>
      </div>
    </main>
  );
}