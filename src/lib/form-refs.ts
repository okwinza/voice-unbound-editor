/**
 * Form reference parsing & validation: `Plugin.esp|0xHEX`.
 *
 * The plugin side (ConfigManager.cpp:40-76) resolves these at scan time by
 * calling TESDataHandler::LookupForm. We only need to verify shape here;
 * resolution validity (plugin actually loaded, form actually exists) is
 * deferred to runtime and surfaced as a warning.
 */

const FORM_REF_RE = /^([^|]+\.(?:esp|esm|esl))\|0x([0-9A-Fa-f]{1,8})$/;

export interface FormRef {
  plugin: string;
  localIdHex: string; // without 0x prefix, lowercased, padded to 8
}

export function parseFormRef(
  text: string,
): { ok: true; value: FormRef } | { ok: false; error: string } {
  if (!text) return { ok: false, error: "Form reference cannot be empty." };
  const m = FORM_REF_RE.exec(text.trim());
  if (!m) {
    return {
      ok: false,
      error: "Expected format: Plugin.esp|0xHEX (e.g. Skyrim.esm|0x00000007)",
    };
  }
  return {
    ok: true,
    value: {
      plugin: m[1],
      localIdHex: m[2].toLowerCase().padStart(8, "0"),
    },
  };
}

export function serializeFormRef(ref: FormRef): string {
  return `${ref.plugin}|0x${ref.localIdHex}`;
}

/** Quick boolean check used by inline UI validation. */
export function isFormRef(text: string): boolean {
  return FORM_REF_RE.test(text.trim());
}

/** Hex validation: returns true for 1-8 hex digits (with optional 0x). */
export function isHexLocalId(text: string): boolean {
  const s = text.trim().replace(/^0x/i, "");
  return s.length > 0 && s.length <= 8 && /^[0-9A-Fa-f]+$/.test(s);
}

/** Normalize user-typed hex (strip 0x, lowercase, pad to 8). */
export function normalizeHex(text: string): string {
  return text.trim().replace(/^0x/i, "").toLowerCase().padStart(8, "0");
}
