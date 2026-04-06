/**
 * Typed accessors for fields on a parsed VoiceLine DOM. The DOM arrives as
 * `unknown` (from the store's raw-JSON deserialization) so these helpers
 * narrow safely.
 */

function getString(dom: unknown, key: string): string | null {
  if (dom && typeof dom === "object" && key in dom) {
    const v = (dom as Record<string, unknown>)[key];
    return typeof v === "string" ? v : null;
  }
  return null;
}

export function extractEventName(dom: unknown): string | null {
  return getString(dom, "event");
}

export function extractSubtitle(dom: unknown): string {
  if (!dom || typeof dom !== "object") return "";
  const sub = (dom as Record<string, unknown>).subtitle;
  if (!sub || typeof sub !== "object") return "";
  const text = (sub as Record<string, unknown>).text;
  return typeof text === "string" ? text : "";
}

export function extractSubtitleDurationMs(dom: unknown): number | null {
  if (!dom || typeof dom !== "object") return null;
  const sub = (dom as Record<string, unknown>).subtitle;
  if (!sub || typeof sub !== "object") return null;
  const v = (sub as Record<string, unknown>).duration_ms;
  return typeof v === "number" ? v : null;
}
