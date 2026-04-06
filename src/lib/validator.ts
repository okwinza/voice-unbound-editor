/**
 * Validator — semantic checks beyond what Zod can express.
 *
 * Issue severity:
 *   - "error":   file will not be usable as-is (malformed JSON, missing event,
 *                bad enum, invalid form-ref). Blocks autosave.
 *   - "warning": plugin will log a warning at runtime but still load the file
 *                (unknown filter key, unknown event name, keyword+formID both
 *                set on HasActiveEffect, etc.).
 *   - "info":    advisory (important makes exclusive redundant, duration
 *                mismatches wav length).
 */

import {
  VoiceLinePermissiveSchema,
  type VoiceLinePermissive,
} from "./schema";
import {
  FILTER_KEYS_PER_EVENT,
  getAllowedFilterKeys,
  isKnownEvent,
  type EventName,
  type FilterKeySpec,
} from "./enums";
import { parseFormRef } from "./form-refs";
import { suggestEventName } from "./event-typos";

export type IssueSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
  /** Dot path into the document (e.g. "event_filter.target" or "conditions.0.threshold"). */
  path: string;
  /** Optional suggested fix the UI can offer one-click. */
  fix?: { label: string; patch: unknown };
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

// ---------- Single-document validation ----------

export function validateDocument(dom: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Permissive parse accepts any string for `event` so typos reach the
  // suggestion path below instead of being reported as a generic enum error.
  // Every other field is validated strictly.
  const parsed = VoiceLinePermissiveSchema.safeParse(dom);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        severity: "error",
        message: issue.message,
        path: issue.path.join("."),
      });
    }
    return { ok: false, issues };
  }

  const line = parsed.data;

  if (!isKnownEvent(line.event)) {
    const suggestion = suggestEventName(line.event);
    issues.push({
      severity: "warning",
      message: suggestion
        ? `Unknown event "${line.event}" — did you mean "${suggestion}"?`
        : `Unknown event "${line.event}" — plugin will ignore this file.`,
      path: "event",
      fix: suggestion
        ? { label: `Fix: ${suggestion}`, patch: { event: suggestion } }
        : undefined,
    });
    return { ok: false, issues };
  }

  // `event` is now narrowed to EventName via isKnownEvent's type guard.
  const event: EventName = line.event;

  issues.push(...validateFilters(line, event));
  issues.push(...validateFormRefs(line, event));

  if (line.important && line.exclusive) {
    issues.push({
      severity: "info",
      message: "`exclusive` has no effect when `important` is set — safe to remove.",
      path: "exclusive",
    });
  }

  return { ok: !issues.some((i) => i.severity === "error"), issues };
}

// ---------- Filter validation ----------

function validateFilters(
  line: VoiceLinePermissive,
  event: EventName,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // AnimationEvent without a tag filter fires on every animation tag the
  // player's graph emits — almost always a mistake.
  if (event === "AnimationEvent") {
    const tagValue = line.event_filter?.tag;
    const hasTag =
      typeof tagValue === "string"
        ? tagValue.trim().length > 0
        : Array.isArray(tagValue) && tagValue.length > 0;
    if (!hasTag) {
      issues.push({
        severity: "warning",
        message:
          "AnimationEvent with no `tag` filter will fire on every animation tag the player's graph emits — cooldown will be spammed.",
        path: "event_filter.tag",
      });
    }
  }

  if (!line.event_filter) return issues;

  const specByKey = new Map<string, FilterKeySpec>(
    FILTER_KEYS_PER_EVENT[event].map((s) => [s.key, s]),
  );

  for (const [key, raw] of Object.entries(line.event_filter)) {
    const spec = specByKey.get(key);
    if (!spec) {
      issues.push({
        severity: "warning",
        message: `Filter key "${key}" is not recognized for event "${event}" — plugin will log a warning at runtime.`,
        path: `event_filter.${key}`,
      });
      continue;
    }
    if (spec.kind !== "enum" && spec.kind !== "boolString") continue;

    const values = Array.isArray(raw) ? raw : [raw];
    const allowed = spec.values as readonly string[];
    for (const v of values) {
      // enum/boolString specs only accept string values; number values
      // land in numberList kinds which we skip above.
      if (typeof v !== "string") continue;
      if (!allowed.includes(v)) {
        issues.push({
          severity: "warning",
          message: `Filter value "${v}" is not a known value for "${key}" — expected: ${spec.values.join(", ")}.`,
          path: `event_filter.${key}`,
        });
      }
    }
  }

  return issues;
}

// ---------- Form-ref validation ----------

function validateFormRefs(
  line: VoiceLinePermissive,
  event: EventName,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!line.event_filter) return issues;

  const formRefKeys = new Set(
    FILTER_KEYS_PER_EVENT[event]
      .filter((s) => s.kind === "formRef")
      .map((s) => s.key),
  );
  const allowedKeys = new Set(getAllowedFilterKeys(event));

  for (const [key, rawValue] of Object.entries(line.event_filter)) {
    // Unknown keys are already flagged by validateFilters; skip.
    if (!allowedKeys.has(key)) continue;

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const v of values) {
      // Number filters (FallEvent.after_seconds) can't be form-refs.
      if (typeof v !== "string") continue;
      const looksLikeFormRef = v.includes("|");
      const requiresFormRef = formRefKeys.has(key);

      if (requiresFormRef && !looksLikeFormRef) {
        issues.push({
          severity: "error",
          message: `"${key}" requires a form reference — expected Plugin.esp|0xHEX.`,
          path: `event_filter.${key}`,
        });
        continue;
      }
      if (!looksLikeFormRef) continue;

      const result = parseFormRef(v);
      if (!result.ok) {
        issues.push({
          severity: "error",
          message: `Malformed form reference "${v}" — ${result.error}`,
          path: `event_filter.${key}`,
        });
      }
    }
  }

  return issues;
}

// ---------- Wav-pairing validation (caller supplies wav presence) ----------

export function validateWavPairing(
  line: VoiceLinePermissive,
  hasWav: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (hasWav) return issues;

  const text = line.subtitle?.text ?? "";
  if (!text) {
    issues.push({
      severity: "error",
      message: "Silent line requires a non-empty subtitle.text.",
      path: "subtitle.text",
    });
  }
  if (text && (line.subtitle?.duration_ms ?? 0) <= 0) {
    issues.push({
      severity: "error",
      message: "Silent line requires subtitle.duration_ms > 0.",
      path: "subtitle.duration_ms",
    });
  }
  return issues;
}

// ---------- Wav-duration advisory ----------

export function validateWavDurationHint(
  subtitleMs: number,
  wavDurationMs: number,
): ValidationIssue | null {
  if (wavDurationMs <= 0) return null;
  const diff = Math.abs(subtitleMs - wavDurationMs) / wavDurationMs;
  if (diff <= 0.25) return null;
  return {
    severity: "info",
    message: `subtitle_duration_ms (${subtitleMs}) differs from wav length (${Math.round(
      wavDurationMs,
    )}ms) by more than 25%.`,
    path: "subtitle_duration_ms",
  };
}
