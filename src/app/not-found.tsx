import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="mt-4 text-2xl font-extrabold">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-stone-600">But your first store can, in about 2 minutes.</p>
      <Link href="/" className="mt-6 rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
        Create my store
      </Link>
    </main>
  );
}