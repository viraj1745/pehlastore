"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export default function AdminSettings({ email }: { email: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setMessage({ ok: false, text: "The new passwords don't match." });
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") {
        setMessage({ ok: true, text: "Password changed." });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else setMessage({ ok: false, text: data?.message ?? "Couldn't change the password." });
    } catch {
      setMessage({ ok: false, text: "Connection problem. Please try again." });
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold">👤 Your account</p>
        <p className="mt-3 text-sm">
          Signed in as <b>{email}</b>
        </p>
        <p className="mt-2 text-xs text-stone-500">
           Sessions last 7 days. To add another admin, share the invite code (ADMIN_INVITE_CODE) privately. They create their own account.
        </p>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.refresh();
          }}
          className="press mt-5 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold"
        >
          Sign out
        </button>
      </div>

      <form onSubmit={change} className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold">🔒 Change password</p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Current password</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">New password (8+ characters)</span>
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-700">Confirm new password</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || !current || !next || !confirm}
          className="press mt-4 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-stone-300"
        >
          {busy ? "Saving…" : "Change password"}
        </button>
        {message && <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
      </form>
    </div>
  );
}