import { PRODUCT_TYPES, StoreContentSchema, type ProductType, type StoreContent } from "./types";
import { charmPrice, normalisePrice, PRICE_BANDS } from "./pricing";
import { findRiskyClaims } from "./claims";

export type FinaliseResult =
  | { ok: true; store: StoreContent; warnings: string[]; priceAdjustments: string[] }
  | { ok: false; error: string };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function clip(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max - 1).join("").trimEnd() + "…";
}

function nameFromHandle(handle: string): string {
  return handle.replace(/[._]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Turns raw model output into a store that always follows our product rules. */
export function finaliseStore(raw: unknown, handle: string): FinaliseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "the store object was missing" };
  const r = raw as Record<string, unknown>;

  const rawProducts = Array.isArray(r.products) ? (r.products as Record<string, unknown>[]) : [];
  const products = rawProducts
    .map((p) => ({
      type: str(p.type) as ProductType,
      format_label: str(p.format_label),
      title: str(p.title),
      description: str(p.description),
      price_inr: typeof p.price_inr === "number" ? p.price_inr : Number(p.price_inr) || 0,
      price_reason: str(p.price_reason),
      cta_label: str(p.cta_label),
      faq: Array.isArray(p.faq)
        ? (p.faq as Record<string, unknown>[])
            .map((f) => ({ q: str(f.q), a: str(f.a) }))
            .filter((f) => f.q && f.a)
            .slice(0, 3)
        : [],
    }))
    .filter((p) => (PRODUCT_TYPES as readonly string[]).includes(p.type) && p.title);

  const leadIndex = products.findIndex((p) => p.type === "lead_magnet");
  if (leadIndex === -1) return { ok: false, error: "products[0] must be a free lead_magnet" };
  const lead = { ...products[leadIndex], price_inr: 0 };

  const paid = products.filter((p, i) => i !== leadIndex && p.type !== "lead_magnet");
  if (paid.length < 2) return { ok: false, error: "there must be 2 or 3 paid products after the free lead magnet" };

  const priceAdjustments: string[] = [];
  const pricedPaid = paid
    .slice(0, 3)
    .map((p) => {
      const { price, adjusted } = normalisePrice(p.type, p.price_inr);
      if (adjusted) priceAdjustments.push(`${p.title}: ₹${p.price_inr} → ₹${price}`);
      return { ...p, price_inr: price };
    })
    .sort((a, b) => a.price_inr - b.price_inr);
  // Make the ladder climb: each paid product clearly above the previous one (about 2x)
  for (let i = 1; i < pricedPaid.length; i++) {
    const previous = pricedPaid[i - 1].price_inr;
    const current = pricedPaid[i];
    if (current.price_inr < previous * 1.5) {
      const lifted = Math.min(PRICE_BANDS[current.type].max, charmPrice(previous * 2));
      if (lifted > current.price_inr) {
        priceAdjustments.push(`${current.title}: ₹${current.price_inr} → ₹${lifted} (price ladder)`);
        pricedPaid[i] = { ...current, price_inr: lifted };
      }
    }
  }

  const finalProducts = [lead, ...pricedPaid].map((p, i) => ({ id: `p${i + 1}`, ...p }));

  const kit = (r.launch_kit ?? {}) as Record<string, unknown>;
  const keyword = str(kit.comment_keyword).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "FREE";
  const withLink = (text: string) => (text.includes("{link}") ? text : `${text} {link}`.trim());

  const candidate = {
    display_name: str(r.display_name) || nameFromHandle(handle) || "My Store",
    tagline: str(r.tagline),
    bio: str(r.bio),
    instagram_bio: clip(str(r.instagram_bio), 150),
    products: finalProducts,
    launch_kit: {
      comment_keyword: keyword,
      reel_caption: str(kit.reel_caption),
      auto_dm_reply: withLink(str(kit.auto_dm_reply)),
      story_text: str(kit.story_text),
      whatsapp_message: withLink(str(kit.whatsapp_message)),
    },
  };

  const parsed = StoreContentSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `field "${issue.path.join(".")}" was invalid (${issue.message})` };
  }
  const warnings = findRiskyClaims(JSON.stringify(parsed.data));
  const faqAnswers = parsed.data.products.flatMap((p) => p.faq.map((f) => f.a)).join(" ");
  if (/refund|money[\s-]?back|recording|lifetime access|certificate/i.test(faqAnswers)) {
    warnings.push("unverified promises (refunds, recordings, certificates or lifetime access)");
  }
  return { ok: true, store: parsed.data, warnings, priceAdjustments };
}