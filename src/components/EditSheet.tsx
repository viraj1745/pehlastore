"use client";

import { useState } from "react";

export type SheetField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "number";
  max?: number;
  help?: (value: string | number) => string;
};

export default function EditSheet({
  title,
  fields,
  values,
  onSave,
  onClose,
  onAiRewrite,
  aiHint,
}: {
  title: string;
  fields: SheetField[];
  values: Record<string, string | number>;
  onSave: (values: Record<string, string | number>) => void;
  onClose: () => void;
  onAiRewrite?: (instruction: string) => Promise<Record<string, string | number>>;
  aiHint?: string;
}) {
  const [draft, setDraft] = useState(values);
  const [instruction, setInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  async function runAi() {
    if (!onAiRewrite) return;
    setAiBusy(true);
    setAiError("");
    try {
      const next = await onAiRewrite(instruction);
      setDraft((prev) => ({ ...prev, ...next }));
      setInstruction("");
    } catch (error) {
      setAiError((error as Error).message);
    }
    setAiBusy(false);
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="anim-sheet-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"        	onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm text-stone-500">
            Close
          </button>
        </div>

        {onAiRewrite && (
          <div className="mt-4 rounded-2xl bg-orange-50 p-3">
            <p className="text-sm font-semibold text-orange-900">✨ Rewrite with AI</p>
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              maxLength={300}
              placeholder={aiHint ?? "Optional: e.g. make it shorter, more premium, for students"}
              className={inputClass}
            />
            <button
              type="button"
              onClick={runAi}
              disabled={aiBusy}
              className="mt-2 w-full rounded-full bg-orange-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {aiBusy ? "Rewriting…" : instruction.trim() ? "Rewrite with my note" : "Give me a different version"}
            </button>
            {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
            <p className="mt-1.5 text-[11px] text-orange-800/80">AI changes apply right away. You can still edit them below.</p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {fields.map((field) => {
            const value = draft[field.key] ?? "";
            return (
              <label key={field.key} className="block">
                <span className="text-sm font-semibold text-stone-700">{field.label}</span>
                {field.kind === "textarea" ? (
                  <textarea
                    rows={4}
                    maxLength={field.max}
                    value={String(value)}
                    onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type={field.kind === "number" ? "number" : "text"}
                    inputMode={field.kind === "number" ? "numeric" : undefined}
                    maxLength={field.max}
                    value={String(value)}
                    onChange={(e) =>
                      setDraft({ ...draft, [field.key]: field.kind === "number" ? Number(e.target.value) : e.target.value })
                    }
                    className={inputClass}
                  />
                )}
                <span className="mt-1 flex justify-between text-xs text-stone-500">
                  <span>{field.help?.(value) ?? ""}</span>
                  {field.max && field.kind !== "number" && (
                    <span>
                      {String(value).length}/{field.max}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-stone-300 py-3 font-semibold">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(draft)} className="flex-1 rounded-full bg-stone-900 py-3 font-semibold text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}