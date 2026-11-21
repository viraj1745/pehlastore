"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "./AdminShell";

type Mode = "signin" | "signup" | "forgot" | "sent";

const input =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
const label = "text-sm font-semibold text-stone-700";
const primary = "press w-full rounded-full bg-orange-600 py-3 font-semibold text-white disabled:bg-stone-300";

export default function AdminLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.status !== "ok") {
        setError(data?.message ?? "Something went wrong. Please try again.");
        return null;
      }
      return data;
    } catch {
      setError("Connection problem. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (next: Mode) => {
    setMode(next);
    setError("");
  };

  const passwordField = (autoComplete: string, hint?: string) => (
    <label className="block">
      <span className={`flex items-center justify-between ${label}`}>
        Password{hint && <span className="font-normal text-stone-400"> {hint}</span>}
        <button type="button" onClick={() => setShow(!show)} className="text-xs font-semibold text-stone-500">
          {show ? "Hide" : "Show"}
        </button>
      </span>
      <input type={show ? "text" : "password"} autoComplete={autoComplete} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
    </label>
  );

  return (
    <AdminShell>
      <div className="anim-fade-up w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <p className="text-2xl font-extrabold">
          Pehla<span className="text-orange-600">Store</span>
        </p>
        <p className="mt-1 text-sm text-stone-500">Admin dashboard</p>

        {(mode === "signin" || mode === "signup") && (
          <div className="mt-5 grid grid-cols-2 rounded-full bg-stone-100 p-1 text-sm">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Create account"],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTo(id)}
                className={`rounded-full py-2 transition ${mode === id ? "bg-white font-semibold shadow-sm" : "text-stone-500"}`}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {mode === "signin" && (
          <form
            className="mt-5 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await post("/api/admin/login", { email, password })) router.refresh();
            }}
          >
            <label className="block">
              <span className={label}>Email</span>
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoFocus />
            </label>
            {passwordField("current-password")}
            <button type="submit" disabled={busy || !email.includes("@") || !password} className={primary}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button type="button" onClick={() => switchTo("forgot")} className="w-full pt-1 text-sm font-semibold text-orange-700">
              Forgot password?
            </button>
          </form>
        )}

        {mode === "signup" && (
          <form
            className="mt-5 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await post("/api/admin/signup", { name, email, password, code })) router.refresh();
            }}
          >
            <label className="block">
              <span className={label}>Your name</span>
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={input} autoFocus />
            </label>
            <label className="block">
              <span className={label}>Email</span>
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </label>
            {passwordField("new-password", "(8+ characters)")}
            <label className="block">
              <span className={label}>Invite code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" className={`${input} uppercase tracking-wider`} />
              <span className="mt-1 block text-xs text-stone-500">Admin access is invite-only. Ask the PehlaStore owner for the code.</span>
            </label>
            <button type="submit" disabled={busy || !name.trim() || !email.includes("@") || password.length < 8 || !code.trim()} className={primary}>
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form
            className="mt-6 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = await post("/api/admin/reset", { action: "send", email });
              if (data) {
                setInfo(data.message);
                setMode("sent");
              }
            }}
          >
            <p className="text-sm text-stone-600">Enter your account email. We&apos;ll send a link to set a new password.</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} autoFocus />
            <button type="submit" disabled={busy || !email.includes("@")} className={primary}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <button type="button" onClick={() => switchTo("signin")} className="w-full pt-1 text-sm text-stone-500">
              ← Back to sign in
            </button>
          </form>
        )}

        {mode === "sent" && (
          <div className="mt-6 text-center">
            <p className="text-4xl">📬</p>
            <p className="mt-2 font-bold">Check your email</p>
            <p className="mt-1 text-sm text-stone-600">{info}</p>
            <p className="mt-3 rounded-xl bg-stone-100 p-3 text-xs text-stone-600">
              Open the &quot;Reset your password&quot; email and tap the link. It works once and expires in about an hour.
            </p>
            <button type="button" onClick={() => switchTo("signin")} className="mt-4 text-sm text-stone-500">
              ← Back to sign in
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </AdminShell>
  );
}