/**
 * Path helpers for workspace file paths. All paths are virtual/OS-native
 * and may contain either forward or back slashes.
 */

const SEP_RE = /[\\/]/;

export function basename(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i < 0 ? path : path.slice(i + 1);
}

export function folderOf(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i < 0 ? "" : path.slice(0, i);
}

/** Strip a leading `.json` extension (case-insensitive) from a filename. */
export function stemOf(filename: string): string {
  return filename.replace(/\.json$/i, "");
}

/** Companion wav path for a json path: same folder + basename, .wav instead. */
export function wavPathFor(jsonPath: string): string {
  return jsonPath.replace(/\.json$/i, ".wav");
}

/** Split a path into its segments, handling both separators. */
export function splitPath(path: string): string[] {
  return path.split(SEP_RE).filter(Boolean);
}
