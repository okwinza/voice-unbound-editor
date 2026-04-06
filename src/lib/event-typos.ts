/**
 * Levenshtein-distance event-name suggestions for import-fix.
 *
 * Runs ONLY when loading a hand-edited JSON whose `event` field doesn't match
 * a known event — never on in-app edits (the event dropdown is a strict
 * Select, so typos are impossible from inside the editor).
 *
 * Mirrors the plugin's own suggestion logic in ConfigScanner.cpp:124-153 but
 * uses real Levenshtein distance rather than its simpler char-mismatch
 * counter.
 */

import { KNOWN_EVENTS } from "./enums";

export function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  // DP on a rolling single row.
  const prev = new Array<number>(bl + 1);
  const curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= bl; j++) prev[j] = curr[j];
  }
  return prev[bl];
}

/** Returns the closest known event name if the distance is ≤ maxDist. */
export function suggestEventName(
  input: string,
  maxDist = 3,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  const inputLower = input.toLowerCase();
  for (const candidate of KNOWN_EVENTS) {
    const d = levenshtein(inputLower, candidate.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return bestDist <= maxDist ? best : null;
}
