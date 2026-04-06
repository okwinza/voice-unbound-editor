/**
 * Filename helpers — auto-increment and validation.
 *
 * Modders use naming conventions like `okw_battlecry_01.json`,
 * `okw_battlecry_02.json`, etc. When the user hits Ctrl+D (duplicate), we
 * detect the trailing `_NN` number and bump it. If there's no number suffix
 * we fall back to `_copy`.
 */

const NUMBERED_RE = /^(.+?)_(\d+)\.json$/i;
const COPY_RE = /^(.+?)_copy(?:_(\d+))?\.json$/i;
const JSON_RE = /\.json$/i;

export interface IncrementResult {
  /** New filename (basename only). */
  name: string;
  /** True if number suffix was bumped; false if fallback `_copy` was used. */
  numbered: boolean;
}

/**
 * Given an existing filename and a set of sibling filenames in the same
 * folder, produce the next unique filename by incrementing the numeric
 * suffix (or appending `_copy`).
 */
export function nextFilename(
  current: string,
  siblings: ReadonlySet<string>,
): IncrementResult {
  if (!JSON_RE.test(current)) {
    throw new Error(`nextFilename: not a .json file: ${current}`);
  }

  // 1. _NN numeric suffix bump
  const m = NUMBERED_RE.exec(current);
  if (m) {
    const stem = m[1];
    const width = m[2].length;
    let n = parseInt(m[2], 10) + 1;
    for (;;) {
      const candidate = `${stem}_${String(n).padStart(width, "0")}.json`;
      if (!siblings.has(candidate)) return { name: candidate, numbered: true };
      n++;
    }
  }

  // 2. _copy / _copy_N fallback
  const existingCopy = COPY_RE.exec(current);
  if (existingCopy) {
    // Already a copy — bump its counter.
    const stem = existingCopy[1];
    let n = existingCopy[2] ? parseInt(existingCopy[2], 10) + 1 : 2;
    for (;;) {
      const candidate = `${stem}_copy_${n}.json`;
      if (!siblings.has(candidate)) return { name: candidate, numbered: false };
      n++;
    }
  }

  // 3. Plain filename — append _copy
  const stem = current.replace(JSON_RE, "");
  const first = `${stem}_copy.json`;
  if (!siblings.has(first)) return { name: first, numbered: false };
  let n = 2;
  for (;;) {
    const candidate = `${stem}_copy_${n}.json`;
    if (!siblings.has(candidate)) return { name: candidate, numbered: false };
    n++;
  }
}

/** Validate that a user-typed filename is safe + follows conventions. */
export function validateFilename(name: string): { ok: true } | { ok: false; error: string } {
  if (!name) return { ok: false, error: "Filename cannot be empty." };
  if (!JSON_RE.test(name)) return { ok: false, error: "Filename must end in .json." };
  if (/[\\/:*?"<>|]/.test(name)) {
    return { ok: false, error: "Filename contains invalid characters." };
  }
  if (name.length > 240) return { ok: false, error: "Filename too long." };
  return { ok: true };
}
