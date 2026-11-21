"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🛠️</p>
      <h1 className="mt-4 text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-stone-600">Your store draft is saved on this phone. Try again, or go back home.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-orange-600 px-5 py-3 font-semibold text-white">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-stone-300 px-5 py-3 font-semibold">
          Home
        </Link>
      </div>
    </main>
  );
}