"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/client/media";

export type Screenshot = { mimeType: "image/jpeg"; data: string; preview: string };

const MAX = 3;

export default function ScreenshotPicker({
  value,
  onChange,
}: {
  value: Screenshot[];
  onChange: (shots: Screenshot[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    const room = MAX - value.length;
    const picked = Array.from(files).slice(0, room);
    const added: Screenshot[] = [];
    for (const file of picked) {
      try {
        added.push(await compressImage(file));
      } catch {
        setError("One image couldn't be read. Please try a PNG or JPG screenshot.");
      }
    }
    if (files.length > room) setError(`You can add up to ${MAX} screenshots.`);
    onChange([...value, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex gap-2">
        {value.map((shot, i) => (
          <div key={i} className="relative h-28 w-20 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.preview} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
              aria-label="Remove screenshot"
            >
              ✕
            </button>
          </div>
        ))}
        {value.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white text-stone-500 disabled:opacity-60"
          >
            <span className="text-2xl">{busy ? "…" : "+"}</span>
            <span className="text-[11px]">{busy ? "Adding" : "Add"}</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}