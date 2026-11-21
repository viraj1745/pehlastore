"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

const input =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export default function AdminReset() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const accessToken = hash.get("access_token");
    const problem = hash.get("error_description") ?? query.get("error_description");
    // Remove the token from the address bar right away.
    window.history.replaceState(null, "", "/admin/reset");
    if (accessToken) setToken(accessToken);
    else setLinkError(problem ?? "This reset link didn't work or has expired.");
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", accessToken: token, password }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") router.replace("/admin");
      else setError(data?.message ?? "Couldn't save the new password.");
    } catch {
      setError("Connection problem. Please try again.");
    }
    setBusy(false);
  }

  return (
    <AdminShell>
      <div className="anim-fade-up w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <p className="text-2xl font-extrabold">
          Pehla<span className="text-orange-600">Store</span>
        </p>
        {linkError ? (
          <div className="mt-5 text-center">
            <p className="text-3xl">⚠️</p>
            <p className="mt-2 font-bold">Link not valid</p>
            <p className="mt-1 text-sm text-stone-600">{linkError}</p>
            <a href="/admin" className="mt-5 inline-block rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
              Back to sign in
            </a>
          </div>
        ) : !token ? (
          <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
        ) : (
          <form onSubmit={save} className="mt-5 space-y-3">
            <p className="text-sm text-stone-600">Choose a new password for the admin dashboard.</p>
            <label className="block">
              <span className="text-sm font-semibold text-stone-700">New password</span>
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} autoFocus />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-stone-700">Confirm new password</span>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            </label>
            <button type="submit" disabled={busy || !password || !confirm} className="press w-full rounded-full bg-orange-600 py-3 font-semibold text-white disabled:bg-stone-300">
              {busy ? "Saving…" : "Save and sign in"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </AdminShell>
  );
}