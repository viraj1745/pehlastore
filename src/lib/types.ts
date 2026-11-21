import { z } from "zod";

export const PRODUCT_TYPES = ["lead_magnet", "digital_product", "course", "webinar", "one_on_one", "community"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  lead_magnet: "Free lead magnet",
  digital_product: "Digital product",
  course: "Course",
  webinar: "Live webinar",
  one_on_one: "1:1 session",
  community: "Paid community",
};

export const LANGUAGES = ["en", "hinglish", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English (simple Indian English)",
  hinglish: "Hinglish (Hindi + English mixed, Roman script)",
  hi: "Hindi (Devanagari script)",
};

export const FOLLOWER_TIERS = ["under_5k", "5k_20k", "20k_50k", "50k_100k", "100k_plus", "unknown"] as const;
export type FollowerTier = (typeof FOLLOWER_TIERS)[number];
export const FOLLOWER_LABELS: Record<FollowerTier, string> = {
  under_5k: "under 5K",
  "5k_20k": "5K to 20K",
  "20k_50k": "20K to 50K",
  "50k_100k": "50K to 100K",
  "100k_plus": "over 100K",
  unknown: "not shared",
};

export const FaqSchema = z.object({
  q: z.string().min(3).max(160),
  a: z.string().min(3).max(400),
});

export const ProductSchema = z.object({
  id: z.string(),
  type: z.enum(PRODUCT_TYPES),
  format_label: z.string().min(2).max(60),
  title: z.string().min(3).max(90),
  description: z.string().min(20).max(600),
  price_inr: z.number().int().min(0).max(100000),
  price_reason: z.string().min(5).max(300),
  cta_label: z.string().min(2).max(30),
  faq: z.array(FaqSchema).max(3),
});
export type Product = z.infer<typeof ProductSchema>;

export const LaunchKitSchema = z.object({
  comment_keyword: z.string().min(2).max(15),
  reel_caption: z.string().min(20).max(800),
  auto_dm_reply: z.string().min(10).max(400),
  story_text: z.string().min(5).max(200),
  whatsapp_message: z.string().min(20).max(700),
});
export type LaunchKit = z.infer<typeof LaunchKitSchema>;

// ---------- Modular page: sections and design ----------
export const BLOCK_TYPES = ["products", "about", "links", "socials", "testimonials", "video", "faq", "announcement"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BlockSchema = z.object({
  id: z.string().min(1).max(24),
  type: z.enum(BLOCK_TYPES),
  hidden: z.boolean().default(false),
  title: z.string().max(80).default(""),
  text: z.string().max(800).default(""),
  url: z.string().max(300).default(""),
  links: z.array(z.object({ label: z.string().min(1).max(60), url: z.string().min(4).max(300) })).max(8).default([]),
  quotes: z.array(z.object({ quote: z.string().min(3).max(300), name: z.string().max(60).default("") })).max(6).default([]),
  faqs: z.array(z.object({ q: z.string().min(3).max(160), a: z.string().min(1).max(500) })).max(8).default([]),
  socials: z
    .object({
      instagram: z.string().max(60).default(""),
      youtube: z.string().max(120).default(""),
      whatsapp: z.string().max(20).default(""),
      telegram: z.string().max(80).default(""),
    })
    .default({ instagram: "", youtube: "", whatsapp: "", telegram: "" }),
});
export type Block = z.infer<typeof BlockSchema>;

export const FONT_STYLES = ["modern", "elegant", "rounded"] as const;
export const BUTTON_STYLES = ["pill", "rounded", "square"] as const;
export const CARD_STYLES = ["shadow", "outline", "flat"] as const;
export const DesignSchema = z.object({
  font: z.enum(FONT_STYLES).default("modern"),
  button: z.enum(BUTTON_STYLES).default("pill"),
  card: z.enum(CARD_STYLES).default("shadow"),
});
export type Design = z.infer<typeof DesignSchema>;

export const StoreContentSchema = z.object({
  display_name: z.string().min(1).max(60),
  tagline: z.string().min(3).max(140),
  bio: z.string().min(20).max(700),
  instagram_bio: z.string().min(10).max(160),
  products: z.array(ProductSchema).min(1).max(6),
  launch_kit: LaunchKitSchema,
  blocks: z.array(BlockSchema).max(12).optional(),
  design: DesignSchema.optional(),
});
export type StoreContent = z.infer<typeof StoreContentSchema>;

export const AssessmentSchema = z.object({
  input_quality: z.enum(["ok", "too_vague", "gibberish"]),
  follow_up_question: z.string().max(300).default(""),
  detected_handle: z.string().max(60).default(""),
  detected_followers: z.string().max(60).default(""),
  detected_niche: z.string().max(120).default(""),
});

export const MediaSchema = z.object({
  mimeType: z.string().regex(/^(image\/(jpeg|png|webp)|audio\/(wav|x-wav|webm|mp4|mpeg|ogg|aac))$/),
  data: z.string().min(10),
});

export const GenerateRequestSchema = z.object({
  sessionId: z.string().max(64).optional(),
  handle: z.string().max(80).default(""),
  description: z.string().max(2000).default(""),
  language: z.enum(LANGUAGES).default("en"),
  followers: z.enum(FOLLOWER_TIERS).default("unknown"),
  images: z.array(MediaSchema).max(3).default([]),
  audio: MediaSchema.nullable().optional(),
  avoidTitles: z.array(z.string().max(120)).max(6).default([]),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const ContextSchema = z.object({
  handle: z.string().max(80).default(""),
  description: z.string().max(2000).default(""),
  language: z.enum(LANGUAGES).default("en"),
  followers: z.enum(FOLLOWER_TIERS).default("unknown"),
});

export const RegenerateRequestSchema = z.object({
  sessionId: z.string().max(64).optional(),
  section: z.enum(["profile", "product"]),
  productIndex: z.number().int().min(0).max(3).optional(),
  instruction: z.string().max(300).default(""),
  context: ContextSchema,
  store: StoreContentSchema,
});
export type RegenerateRequest = z.infer<typeof RegenerateRequestSchema>;

export const PublishRequestSchema = z.object({
  sessionId: z.string().max(64).optional(),
  handle: z.string().max(80).default(""),
  theme: z.string().max(20).default("sunrise"),
  language: z.enum(LANGUAGES).default("en"),
  store: StoreContentSchema,
  slug: z.string().max(60).optional(),
  editToken: z.string().max(80).optional(),
});
export type PublishRequest = z.infer<typeof PublishRequestSchema>;

export const TrackRequestSchema = z.object({
  slug: z.string().max(60),
  kind: z.enum(["view", "interest", "cta"]),
  productKey: z.string().max(10).optional(),
});

// ---------- Product toolkit: outline, bump offer, launch plan ----------
export const OutlineSchema = z.object({
  title: z.string().min(3).max(120),
  promise: z.string().min(10).max(300),
  time_to_make: z.string().min(2).max(80),
  format_tip: z.string().min(5).max(300),
  sections: z
    .array(
      z.object({
        heading: z.string().min(2).max(120),
        points: z.array(z.string().min(2).max(240)).min(1).max(6),
      }),
    )
    .min(3)
    .max(8),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const BumpSchema = z.object({
  title: z.string().min(3).max(90),
  price_inr: z.number().int().min(29).max(999),
  pitch: z.string().min(10).max(240),
});
export type Bump = z.infer<typeof BumpSchema>;

export const PLAN_CHANNELS = ["Reel", "Story", "Post", "Carousel", "WhatsApp", "Live"] as const;
export const LaunchPlanSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        channel: z.enum(PLAN_CHANNELS),
        title: z.string().min(3).max(100),
        script: z.string().min(10).max(700),
      }),
    )
    .length(7),
});
export type LaunchPlan = z.infer<typeof LaunchPlanSchema>;

export const AssistRequestSchema = z.object({
  sessionId: z.string().max(64).optional(),
  kind: z.enum(["outline", "bump", "launch_plan"]),
  productIndex: z.number().int().min(0).max(3).optional(),
  context: ContextSchema,
  store: StoreContentSchema,
});
export type AssistRequest = z.infer<typeof AssistRequestSchema>;