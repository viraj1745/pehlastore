import type { Block, BlockType, Product, ProductType } from "./types";
import { PRICE_BANDS } from "./pricing";

export const BLOCK_META: Record<BlockType, { icon: string; label: string; hint: string }> = {
  products: { icon: "🛍️", label: "Products", hint: "Your free and paid offers" },
  about: { icon: "👋", label: "About me", hint: "Your story in a few lines" },
  links: { icon: "🔗", label: "Links", hint: "YouTube, blog, booking page…" },
  socials: { icon: "📱", label: "Social profiles", hint: "Instagram, YouTube, WhatsApp, Telegram" },
  testimonials: { icon: "💬", label: "Testimonials", hint: "Real words from followers or buyers" },
  video: { icon: "▶️", label: "Video", hint: "A YouTube intro or sample lesson" },
  faq: { icon: "❓", label: "FAQ", hint: "Questions people often ask you" },
  announcement: { icon: "📣", label: "Announcement", hint: "A highlighted banner, e.g. a launch date" },
};

const rid = () => Math.random().toString(36).slice(2, 8);

export function newBlock(type: BlockType, handle = ""): Block {
  return {
    id: `${type.slice(0, 3)}-${rid()}`,
    type,
    hidden: false,
    title: "",
    text: "",
    url: "",
    links: [],
    quotes: [],
    faqs: [],
    socials: { instagram: type === "socials" ? handle : "", youtube: "", whatsapp: "", telegram: "" },
  };
}

/** New stores start with their products and, if we know it, their Instagram. */
export function defaultBlocks(handle: string): Block[] {
  return [
    { ...newBlock("products"), id: "products" },
    ...(handle ? [{ ...newBlock("socials", handle), id: "socials" }] : []),
  ];
}

export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function socialLinks(s: Block["socials"]): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  const ig = s.instagram.replace(/^@/, "").trim();
  if (ig) out.push({ label: "📸 Instagram", href: `https://instagram.com/${ig}` });
  const yt = s.youtube.trim();
  if (yt) out.push({ label: "▶️ YouTube", href: /^https?:|\./i.test(yt) ? normalizeUrl(yt) : `https://youtube.com/@${yt.replace(/^@/, "")}` });
  const wa = s.whatsapp.replace(/\D/g, "");
  if (wa.length >= 10) out.push({ label: "💬 WhatsApp", href: `https://wa.me/${wa.length === 10 ? "91" + wa : wa}` });
  const tg = s.telegram.replace(/^@/, "").trim();
  if (tg) out.push({ label: "✈️ Telegram", href: /^https?:/i.test(tg) ? tg : `https://t.me/${tg}` });
  return out;
}

export function blockHasContent(b: Block): boolean {
  switch (b.type) {
    case "products":
      return true;
    case "about":
    case "announcement":
      return Boolean(b.text.trim());
    case "links":
      return b.links.length > 0;
    case "socials":
      return socialLinks(b.socials).length > 0;
    case "testimonials":
      return b.quotes.length > 0;
    case "video":
      return Boolean(youtubeId(b.url));
    case "faq":
      return b.faqs.length > 0;
    default:
      return false;
  }
}

const FORMAT_BY_TYPE: Record<ProductType, string> = {
  lead_magnet: "Free PDF",
  digital_product: "PDF guide",
  course: "Recorded course",
  webinar: "Live session · 60 min",
  one_on_one: "30-min video call",
  community: "Monthly group",
};

export function blankProduct(type: ProductType): Product {
  const band = PRICE_BANDS[type];
  return {
    id: `p${rid()}`,
    type,
    format_label: FORMAT_BY_TYPE[type],
    title: "New product",
    description: "Describe who this is for and what they get. Tap ✨ AI to write it for you.",
    price_inr: band.max === 0 ? 0 : band.min,
    price_reason: "A starting price you can adjust.",
    cta_label: band.max === 0 ? "Get it free" : "Buy now",
    faq: [],
  };
}