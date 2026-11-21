"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Shown only on the home page, so creators and reviewers can learn what this is. */
export default function AboutPill() {
  const path = usePathname();
  if (path !== "/") return null;
  return (
    <Link
      href="/about"
      className="press fixed right-3 top-3 z-50 rounded-full border border-orange-200 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-orange-800 shadow-sm backdrop-blur"
    >
      What is PehlaStore?
    </Link>
  );
}