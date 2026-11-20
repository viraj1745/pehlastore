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
}: {
  title: string;
  fields: SheetField[];
  values: Record<string, string | number>;
  onSave: (values: Record<string, string | number>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(values);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm text-stone-500">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {fields.map((field) => {
            const value = draft[field.key] ?? "";
            const length = String(value).length;
            const common =
              "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
            return (
              <label key={field.key} className="block">
                <span className="text-sm font-semibold text-stone-700">{field.label}</span>
                {field.kind === "textarea" ? (
                  <textarea
                    rows={4}
                    maxLength={field.max}
                    value={String(value)}
                    onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
                    className={common}
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
                    className={common}
                  />
                )}
                <span className="mt-1 flex justify-between text-xs text-stone-500">
                  <span>{field.help?.(value) ?? ""}</span>
                  {field.max && field.kind !== "number" && (
                    <span>
                      {length}/{field.max}
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
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 rounded-full bg-stone-900 py-3 font-semibold text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}