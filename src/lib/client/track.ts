import { getSessionId } from "./storage";

export function trackEvent(event: string, meta: Record<string, string | number | boolean> = {}) {
  try {
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), event, meta }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never block the creator
  }
}