import type { Bump, FollowerTier, Language, LaunchPlan, Outline, StoreContent } from "@/lib/types";

export type InputDraft = { handle: string; description: string; language: Language; followers: FollowerTier };

export type GenerationMeta = {
  model: string;
  ms: number;
  warnings: string[];
  priceAdjustments: string[];
  detected?: { handle: string; followers: string; niche: string };
};

/** AI helpers the creator asked for: kept with the draft, not published. */
export type StoreExtras = {
  outlines?: Record<string, Outline>;
  bumps?: Record<string, Bump>;
  launchPlan?: LaunchPlan;
};

export type StoreDraft = {
  input: InputDraft;
  store: StoreContent;
  meta: GenerationMeta;
  theme: string;
  savedAt: string;
  published?: { slug: string; editToken: string; publishedAt?: string };
  extras?: StoreExtras;
};

const KEYS = { session: "pehlastore:sid", input: "pehlastore:input:v1", draft: "pehlastore:draft:v1" };

function read<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the app still works, it just won't remember
  }
}

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(KEYS.session);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(KEYS.session, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export const loadInput = () => read<InputDraft>(KEYS.input);
export const saveInput = (value: InputDraft) => write(KEYS.input, value);
export const loadDraft = () => read<StoreDraft>(KEYS.draft);
export const saveDraft = (value: StoreDraft) => write(KEYS.draft, value);
export function clearDraft() {
  try {
    localStorage.removeItem(KEYS.draft);
  } catch {}
}