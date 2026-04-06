/**
 * Dot-path helpers for reading and writing nested fields on plain-object
 * DOMs — used by the bulk-edit flow, the nested-field hooks, and the
 * drop-to-attach auto-fill. Treats paths like "subtitle.duration_ms" or
 * "lipsync.enabled" as a walk through nested Records.
 *
 * Writes always clone every parent on the way down (immutability), and
 * drop any container that becomes empty after the write, so serialized
 * JSON stays tidy.
 */

export function readDotPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function writeDotPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  return writeSegments(obj, path.split("."), value);
}

function writeSegments(
  obj: Record<string, unknown>,
  segments: string[],
  value: unknown,
): Record<string, unknown> {
  if (segments.length === 0) return obj;
  const [head, ...rest] = segments;
  const clone: Record<string, unknown> = { ...obj };
  if (rest.length === 0) {
    if (value === undefined) delete clone[head];
    else clone[head] = value;
    return clone;
  }
  const child = clone[head];
  const childObj =
    child && typeof child === "object"
      ? (child as Record<string, unknown>)
      : {};
  const updated = writeSegments(childObj, rest, value);
  if (Object.keys(updated).length === 0) delete clone[head];
  else clone[head] = updated;
  return clone;
}
