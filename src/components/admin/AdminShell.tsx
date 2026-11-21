import Link from "next/link";

const POINTS = [
  ["🎯", "North-star", "Share of visitors who publish a store in their first session."],
  ["📈", "Funnel", "Visited → store drafted → published → shared, with the drop-off at each step."],
  ["🏪", "Demand", "Which products visitors tap, before the creator spends time building them."],
  ["🤖", "AI health", "Speed, success rate, model fallbacks and failures for every AI call."],
  ["✨", "Ask AI", "Describe any chart or table. Numbers are computed from real data, never by the AI."],
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#fffbf2] text-stone-900">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-10">
        <section>
          <p>
            <Link href="/" className="text-2xl font-extrabold">
              Pehla<span className="text-orange-600">Store</span>
            </Link>
            <span className="ml-2 rounded-full bg-stone-900 px-2 py-0.5 align-middle text-xs font-semibold text-white">Admin</span>
          </p>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight lg:text-4xl">
            Are creators getting from an idea to a <span className="text-orange-600">published store</span>?
          </h1>
          <p className="mt-3 max-w-lg text-stone-600">
            PehlaStore turns a 60-second voice note in English, Hinglish or Hindi into a ready-to-publish store: products, INR prices and launch
            posts. This dashboard shows whether that&apos;s working, and where creators drop off.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map(([icon, title, text]) => (
              <li key={title} className="flex gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">{icon}</span>
                <span>
                  <b>{title}.</b> <span className="text-stone-600">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/about" className="mt-6 inline-block text-sm font-semibold text-orange-700">
            What problem does PehlaStore solve? →
          </Link>
        </section>

        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </main>
  );
}