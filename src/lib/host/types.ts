/**
 * HostBackend — the testability seam between the React UI and the native
 * filesystem. Production uses TauriHost (Tauri fs plugin); tests, Playwright,
 * and Claude Preview use BrowserHost (in-memory FS).
 *
 * All Tauri-specific imports live in tauri-host.ts; this module must stay
 * pure-TypeScript so BrowserHost can import it without pulling in @tauri-apps.
 */

export interface FileEntry {
  path: string; // absolute path, OS-native separators
  name: string; // basename
  kind: "file" | "dir";
  size?: number;
  mtimeMs?: number;
}

export type WatchEventKind = "created" | "modified" | "removed" | "renamed";

export interface WatchEvent {
  kind: WatchEventKind;
  path: string;
  /** Populated only for kind === "renamed". */
  oldPath?: string;
}

export interface HostBackend {
  /** Opens a native folder picker; returns null if the user cancelled. */
  pickFolder(): Promise<string | null>;

  /** Lists a directory non-recursively. */
  readDir(path: string): Promise<FileEntry[]>;

  /** Lists a directory recursively, returning every file/dir beneath it. */
  readDirRecursive(path: string): Promise<FileEntry[]>;

  /** Reads a UTF-8 text file. */
  readTextFile(path: string): Promise<string>;

  /** Writes a UTF-8 text file atomically (temp + rename). */
  writeTextFile(path: string, contents: string): Promise<void>;

  /** Writes raw binary bytes (used for dropped .wav attachments). */
  writeBinaryFile(path: string, bytes: ArrayBuffer): Promise<void>;

  /** Returns true if the path exists. */
  exists(path: string): Promise<boolean>;

  /** Creates a directory (recursive). */
  mkdir(path: string): Promise<void>;

  /** Renames or moves a file/directory. */
  rename(from: string, to: string): Promise<void>;

  /** Deletes a file or empty directory. */
  remove(path: string): Promise<void>;

  /** Opens an OS file/folder explorer window at the given path. */
  revealInExplorer(path: string): Promise<void>;

  /** Watches a folder for changes. Returns an unwatch callback. */
  watchDir(
    path: string,
    onChange: (event: WatchEvent) => void,
  ): Promise<() => void>;

  /** Returns a Blob of a WAV file for wavesurfer playback. */
  readAudioBlob(path: string): Promise<Blob>;

  /**
   * Parses the Skyrim plugin load order from the workspace's adjacent
   * `Data/Plugins.txt` or similar. Returns plugin filenames in load order.
   * Falls back to glob-scanning *.esp/.esm/.esl under Data/.
   */
  discoverPlugins(dataDir: string): Promise<string[]>;

  /** Identifier for debugging / console logs. */
  readonly kind: "tauri" | "browser";
}
