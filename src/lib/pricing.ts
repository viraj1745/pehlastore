import type { FollowerTier, ProductType } from "./types";
import { FOLLOWER_LABELS } from "./types";

/** SuperProfile's platform fee per sale in India. */
export const PLATFORM_FEE = 0.05;

export const PRICE_BANDS: Record<ProductType, { min: number; max: number; unit: string }> = {
  lead_magnet: { min: 0, max: 0, unit: "free" },
  digital_product: { min: 99, max: 999, unit: "one-time" },
  webinar: { min: 99, max: 799, unit: "per seat" },
  one_on_one: { min: 499, max: 2999, unit: "per session" },
  course: { min: 999, max: 7999, unit: "one-time" },
  community: { min: 199, max: 999, unit: "per month" },
};

/** Where in the band to aim, by audience size (bigger audience = more trust = higher price). */
const TIER_POSITION: Record<FollowerTier, number> = {
  under_5k: 0.1,
  "5k_20k": 0.25,
  "20k_50k": 0.45,
  "50k_100k": 0.65,
  "100k_plus": 0.85,
  unknown: 0.3,
};

/** Indian "charm" pricing: ₹99, ₹199, ₹499, ₹999, ₹1,499 ... */
export function charmPrice(n: number): number {
  if (n <= 0) return 0;
  if (n < 150) return 99;
  return Math.max(99, Math.round(n / 100) * 100 - 1);
}

export function targetPrice(type: ProductType, tier: FollowerTier): number {
  const band = PRICE_BANDS[type];
  if (band.max === 0) return 0;
  return charmPrice(band.min + (band.max - band.min) * TIER_POSITION[tier]);
}

/** Keeps a model-suggested price inside the band for its type, as a charm price. */
export function normalisePrice(type: ProductType, raw: number): { price: number; adjusted: boolean } {
  const band = PRICE_BANDS[type];
  if (band.max === 0) return { price: 0, adjusted: raw !== 0 };
  const value = Number.isFinite(raw) ? raw : band.min;
  const clamped = Math.min(band.max, Math.max(band.min, value));
  const price = Math.min(band.max, Math.max(band.min, charmPrice(clamped)));
  return { price, adjusted: price !== raw };
}

export function netAfterFee(price: number): number {
  return Math.round(price * (1 - PLATFORM_FEE));
}

export function priceGuideForPrompt(tier: FollowerTier): string {
  const lines = (Object.keys(PRICE_BANDS) as ProductType[])
    .filter((type) => type !== "lead_magnet")
    .map((type) => {
      const band = PRICE_BANDS[type];
      return `- ${type}: ₹${band.min}–₹${band.max} ${band.unit}; for this audience aim near ₹${targetPrice(type, tier)}`;
    });
  return [`Audience size: ${FOLLOWER_LABELS[tier]}`, "- lead_magnet: always ₹0 (free)", ...lines].join("\n");
}