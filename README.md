# PehlaStore: AI Storefront Generator

Turn a 60-second voice note in English, Hinglish or Hindi into a ready-to-publish creator store: products, INR prices and launch posts.

**Live:** https://pehlastore.vercel.app · **What it solves:** https://pehlastore.vercel.app/about

Built for SuperProfile's AI Storefront Generator assignment. "Pehla" means "first": the product is about getting a creator to their first store.

## The problem

Indian Instagram creators have an audience but get stuck before their first store: they don't know what to sell, how to price it in INR, or how to announce it, and most tools expect polished English. PehlaStore removes the blank page.

## What it does

1. **Input:** voice note (up to 60s), up to 3 screenshots, or a typed description, plus Instagram handle, language and audience size.
2. **AI draft:** profile, Instagram bio, a free lead magnet plus 2–3 paid products on a rising INR price ladder (with a reason for each price), and a launch kit (reel caption, Auto-DM keyword and reply, story text, WhatsApp message).
3. **Edit:** live phone preview; tap anything to edit or rewrite with AI (tone, length, language, custom note) with undo. Add, hide and reorder page sections (About, Links, Socials, Testimonials, Video, FAQ, Announcement). Six themes, three fonts, button and card styles. Add up to six products of any type.
4. **Product toolkit:** price explorer (earnings after the 5% fee at different conversion rates), AI content outline, AI order-bump offer, copy-to-SuperProfile block.
5. **Publish and launch:** public store at `/s/[slug]` with link preview image, 1080×1920 story image, 7-day AI launch plan.
6. **Demand insights:** visits and taps per product, so the creator builds the most-wanted product first.
7. **Admin dashboard (`/admin`):** funnel, publish rate, time to published store, stores, AI health (success rate, p50/p90 latency, model fallbacks, failure reasons), activity feed, and **Ask AI**: describe any chart or table and it's built from real data.

## AI approach

- **Structured output:** Gemini returns JSON against a response schema; responses are validated with Zod.
- **Input check first:** each input is classified `ok` / `too_vague` / `gibberish`. Weak input gets one follow-up question instead of a generic store.
- **Deterministic guardrails after the model:** INR price bands per product type, charm pricing, rising price ladder, free lead magnet first. Corrections are shown to the creator.
- **Claims guard:** income claims, guarantees and invented results are detected and rewritten once.
- **Reliability:** model chain (`gemini-flash-lite-latest` → `gemini-3.1-flash-lite` → `gemini-3-flash-preview`) with per-model timeouts and an overall deadline; overloaded models are skipped.
- **Never AI-written:** testimonials (creators add real ones).
- **Admin Ask AI:** the model only writes a small query plan (dataset, filters, grouping, metric, chart). The server validates it and computes every number, so metrics can't be hallucinated.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · Supabase (Postgres with RLS, Auth for admins) · Google Gemini API · Vercel

## Run locally

```bash
git clone https://github.com/viraj1745/pehlastore.git
cd pehlastore
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Create the tables by running `supabase/schema.sql` in the Supabase SQL editor.

### Environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (never exposed to the browser) |
| `ADMIN_KEY` | Long random string used to sign admin session cookies |
| `ADMIN_INVITE_CODE` | Code required to create an admin account |
| `ADMIN_EMAILS` | Optional: comma-separated emails that are always admins |

No keys are committed to this repo.

## Project structure

```
src/app/            pages: / (create), /edit, /s/[slug], /about, /admin
src/app/api/        generate, regenerate, assist, publish, track, stats, story, health, admin/*
src/components/     StoreView, editor panels, admin dashboard
src/lib/            gemini client, prompts, pricing, claims guard, types, admin query engine
supabase/schema.sql database tables and policies
samples/            example inputs (good and gibberish)
```

## Known limitations

- Hindi and Hinglish output sometimes mixes scripts; backup models occasionally write price reasons in English.
- Creators have no accounts yet: drafts live in the browser and a private edit token updates the published store.
- No payments: products are copied into SuperProfile, which handles checkout.
- Instagram is not scraped; creators describe themselves or add screenshots.