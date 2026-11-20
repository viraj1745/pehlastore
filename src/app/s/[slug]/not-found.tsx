import Link from "next/link";

export default function StoreNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🛍️</p>
      <h1 className="mt-4 text-2xl font-extrabold">This store doesn&apos;t exist (yet)</h1>
      <p className="mt-2 text-stone-600">The link may be mistyped, or the creator hasn&apos;t published it.</p>
      <Link href="/" className="mt-6 rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
        Create your own store in 2 minutes
      </Link>
    </main>
  );
}