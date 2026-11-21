"use client";

import { useState } from "react";
import type { Block, BlockType } from "@/lib/types";
import { BLOCK_TYPES } from "@/lib/types";
import { BLOCK_META } from "@/lib/blocks";

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-sm disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function SectionsManager({
  blocks,
  onChange,
  onEdit,
  onAdd,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onEdit: (id: string) => void;
  onAdd: (type: BlockType) => void;
}) {
  const [adding, setAdding] = useState(false);
  const available = BLOCK_TYPES.filter((type) => type !== "products" && !blocks.some((b) => b.type === type));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">🧩 Page sections</p>
        <span className="text-xs text-stone-500">{blocks.filter((b) => !b.hidden).length} showing</span>
      </div>

      <ul className="mt-3 space-y-2">
        {blocks.map((b, i) => (
          <li
            key={b.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${b.hidden ? "border-dashed border-stone-300 opacity-60" : "border-stone-200"}`}
          >
            <span className="text-lg">{BLOCK_META[b.type].icon}</span>
            <button type="button" onClick={() => onEdit(b.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold">{BLOCK_META[b.type].label}</p>
              <p className="truncate text-xs text-stone-500">{b.hidden ? "Hidden" : BLOCK_META[b.type].hint}</p>
            </button>
            <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </IconBtn>
            <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>
              ↓
            </IconBtn>
            {b.type !== "products" && (
              <>
                <IconBtn label={b.hidden ? "Show" : "Hide"} onClick={() => onChange(blocks.map((x) => (x.id === b.id ? { ...x, hidden: !x.hidden } : x)))}>
                  {b.hidden ? "🙈" : "👁"}
                </IconBtn>
                <IconBtn
                  label="Remove"
                  onClick={() => {
                    if (confirm(`Remove the ${BLOCK_META[b.type].label} section?`)) onChange(blocks.filter((x) => x.id !== b.id));
                  }}
                >
                  🗑
                </IconBtn>
              </>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="anim-fade-up mt-3 grid grid-cols-2 gap-2">
          {available.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setAdding(false);
              }}
              className="press rounded-xl border border-stone-200 p-3 text-left hover:border-orange-300"
            >
              <p className="text-lg">{BLOCK_META[type].icon}</p>
              <p className="text-sm font-semibold">{BLOCK_META[type].label}</p>
              <p className="text-xs text-stone-500">{BLOCK_META[type].hint}</p>
            </button>
          ))}
          {available.length === 0 && <p className="col-span-2 text-sm text-stone-500">All sections are already on your page.</p>}
          <button type="button" onClick={() => setAdding(false)} className="col-span-2 py-1 text-sm text-stone-500">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="press mt-3 w-full rounded-full border-2 border-dashed border-orange-300 py-2.5 text-sm font-semibold text-orange-700"
        >
          + Add a section
        </button>
      )}
    </div>
  );
}