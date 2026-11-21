import { NextResponse } from "next/server";
import { z } from "zod";
import { logEvent } from "@/lib/events";

const ALLOWED = [
  "home_viewed",
  "example_used",
  "edited",
  "ai_rewrite",
  "launch_kit_copied",
  "story_downloaded",
  "link_shared",
  "ai_assist",
] as const;

const EventSchema = z.object({
  sessionId: z.string().max(64),
  event: z.enum(ALLOWED),
  meta: z.record(z.string(), z.union([z.string().max(80), z.number(), z.boolean()])).optional(),
});

export async function POST(request: Request) {
  try {
    const body = EventSchema.parse(await request.json());
    await logEvent(body.sessionId, body.event, body.meta ?? {});
  } catch {
    // analytics never breaks the product
  }
  return NextResponse.json({ ok: true });
}