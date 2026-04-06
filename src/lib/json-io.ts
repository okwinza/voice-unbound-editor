/**
 * JSON serialisation with stable field ordering + preservation of unknown
 * fields. Emits 2-space indented UTF-8 text with a trailing newline.
 *
 * The canonical order is defined by CANONICAL_FIELD_ORDER in enums.ts. Any
 * fields present in the DOM that aren't in that list are appended
 * alphabetically at the end so forward-compat with future plugin versions is
 * preserved (modders can hand-add fields we don't know about and we won't
 * eat them).
 */

import { CANONICAL_FIELD_ORDER } from "./enums";

const CANONICAL_ORDER_INDEX = new Map<string, number>(
  CANONICAL_FIELD_ORDER.map((k, i) => [k, i] as const),
);

export interface SerializeOptions {
  /** Indent spaces. Defaults to 2. */
  indent?: number;
}

/**
 * Serialise an arbitrary JSON object using the canonical key order defined
 * in enums.ts. Unknown keys sort alphabetically after the known ones.
 */
export function serialize(dom: unknown, opts: SerializeOptions = {}): string {
  const indent = opts.indent ?? 2;
  const ordered = reorder(dom);
  return JSON.stringify(ordered, null, indent) + "\n";
}

function reorder(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => reorder(v));
  }
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const keys = Object.keys(src);

    const known = keys
      .filter((k) => CANONICAL_ORDER_INDEX.has(k))
      .sort((a, b) => CANONICAL_ORDER_INDEX.get(a)! - CANONICAL_ORDER_INDEX.get(b)!);
    const unknown = keys.filter((k) => !CANONICAL_ORDER_INDEX.has(k)).sort();

    const out: Record<string, unknown> = {};
    for (const k of [...known, ...unknown]) {
      out[k] = reorder(src[k]);
    }
    return out;
  }
  return value;
}

/**
 * Parse JSON permissively. Returns an error object with line/column if the
 * text is malformed — useful for the Validation panel.
 */
export function parseJsonSafe(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string; line?: number; col?: number } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // V8-style "Unexpected token ... at position 42"
    const posMatch = /position (\d+)/.exec(msg);
    if (posMatch) {
      const pos = Number(posMatch[1]);
      const { line, col } = locateOffset(text, pos);
      return { ok: false, error: msg, line, col };
    }
    return { ok: false, error: msg };
  }
}

function locateOffset(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}
