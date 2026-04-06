/**
 * BrowserHost — in-memory filesystem backing used by tests, Playwright E2E,
 * and the Claude Preview MCP dev loop.
 *
 * The FS is seeded via `seedWorkspace()` called from `window.__seedWorkspace`.
 * Paths use forward-slashes throughout (no Windows-specific normalization).
 * Files are stored as UTF-8 strings; audio files are stored as ArrayBuffers.
 *
 * In addition to synthetic fixtures, this host can back a REAL on-disk folder
 * via the File System Access API (`showDirectoryPicker`) on supporting
 * browsers (Chrome/Edge). Writes flow back through the saved directory
 * handle so edits land on disk.
 */

import type {
  FileEntry,
  HostBackend,
  WatchEvent,
} from "./types";

type FsNode =
  | { kind: "dir"; children: Set<string>; mtimeMs: number }
  | {
      kind: "file";
      text?: string;
      bytes?: ArrayBuffer;
      size: number;
      mtimeMs: number;
    };

export interface SeedFile {
  path: string;
  text?: string;
  bytes?: ArrayBuffer;
}

export interface SeedWorkspace {
  root: string;
  files: SeedFile[];
  plugins?: string[];
}

// File System Access API types (Chromium-only; intentionally narrow).
interface FSDirHandle {
  name: string;
  kind: "directory";
  entries(): AsyncIterableIterator<[string, FSDirHandle | FSFileHandle]>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FSFileHandle>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FSDirHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  queryPermission?(desc: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(desc: { mode: "read" | "readwrite" }): Promise<PermissionState>;
}
interface FSFileHandle {
  name: string;
  kind: "file";
  getFile(): Promise<File>;
  createWritable(): Promise<FSWritableStream>;
}
interface FSWritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
      startIn?: string;
    }) => Promise<FSDirHandle>;
  }
}

function parentOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "/" : path.substring(0, i);
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? path : path.substring(i + 1);
}

// Normalize to forward-slash, collapse duplicates, strip trailing slash.
// All in-memory FS paths pass through this; helpers below assume normalized input.
function normalize(path: string): string {
  const p = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export class BrowserHost implements HostBackend {
  readonly kind = "browser" as const;

  private fs = new Map<string, FsNode>();
  private watchers = new Map<string, Set<(ev: WatchEvent) => void>>();
  private plugins: string[] = [];
  private pickedFolder: string | null = null;
  // When a real directory was picked via showDirectoryPicker, writes flow
  // back through handles stored here (keyed by normalized absolute path).
  private fileHandles = new Map<string, FSFileHandle>();
  private rootDirHandle: FSDirHandle | null = null;

  constructor() {
    this.fs.set("/", { kind: "dir", children: new Set(), mtimeMs: Date.now() });
  }

  // ---------- Seeding ----------

  seedWorkspace(seed: SeedWorkspace): void {
    this.fs.clear();
    this.watchers.clear();
    this.fileHandles.clear();
    this.rootDirHandle = null;
    this.fs.set("/", { kind: "dir", children: new Set(), mtimeMs: Date.now() });

    const root = normalize(seed.root);
    this.ensureDir(root);
    this.pickedFolder = root;

    for (const file of seed.files) {
      const path = normalize(file.path);
      this.ensureDir(parentOf(path));
      const node: FsNode = {
        kind: "file",
        text: file.text,
        bytes: file.bytes,
        size: file.text ? file.text.length : (file.bytes?.byteLength ?? 0),
        mtimeMs: Date.now(),
      };
      this.fs.set(path, node);
      this.addChild(parentOf(path), path);
    }
    this.plugins = seed.plugins ?? [];
  }

  /** Expose the in-memory FS for test assertions. */
  snapshot(): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    for (const [path, node] of this.fs.entries()) {
      if (node.kind === "file") {
        out[path] = node.text ?? null;
      }
    }
    return out;
  }

  // ---------- HostBackend impl ----------

  async pickFolder(): Promise<string | null> {
    if (typeof window !== "undefined" && window.showDirectoryPicker) {
      try {
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        await this.mountDirectoryHandle(handle);
        return this.pickedFolder;
      } catch (err) {
        // User cancelled, or permission denied.
        if ((err as Error)?.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.warn("[browser-host] showDirectoryPicker failed:", err);
        }
        return null;
      }
    }
    // Unsupported browser: surface a hint via the selected-folder readout.
    // eslint-disable-next-line no-console
    console.warn(
      "[browser-host] showDirectoryPicker is unavailable in this browser. " +
      "Use Chrome or Edge, or use Tauri mode.",
    );
    return this.pickedFolder;
  }

  async readDir(path: string): Promise<FileEntry[]> {
    const node = this.fs.get(normalize(path));
    if (!node || node.kind !== "dir") {
      throw new Error(`readDir: not a directory: ${path}`);
    }
    const out: FileEntry[] = [];
    for (const childPath of node.children) {
      const child = this.fs.get(childPath);
      if (!child) continue;
      out.push({
        path: childPath,
        name: basename(childPath),
        kind: child.kind,
        size: child.kind === "file" ? child.size : undefined,
        mtimeMs: child.mtimeMs,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  async readDirRecursive(path: string): Promise<FileEntry[]> {
    const root = normalize(path);
    const out: FileEntry[] = [];
    const visit = async (dir: string): Promise<void> => {
      const entries = await this.readDir(dir);
      out.push(...entries);
      await Promise.all(
        entries.filter((e) => e.kind === "dir").map((e) => visit(e.path)),
      );
    };
    await visit(root);
    return out;
  }

  async readTextFile(path: string): Promise<string> {
    const node = this.fs.get(normalize(path));
    if (!node || node.kind !== "file" || node.text === undefined) {
      throw new Error(`readTextFile: not a text file: ${path}`);
    }
    return node.text;
  }

  async writeTextFile(path: string, contents: string): Promise<void> {
    const p = normalize(path);
    this.ensureDir(parentOf(p));
    const existing = this.fs.get(p);
    this.fs.set(p, {
      kind: "file",
      text: contents,
      size: contents.length,
      mtimeMs: Date.now(),
    });
    if (!existing) this.addChild(parentOf(p), p);

    // If we're mounted against a real directory handle, flush to disk.
    const handle = this.fileHandles.get(p);
    if (handle) {
      try {
        const stream = await handle.createWritable();
        await stream.write(contents);
        await stream.close();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[browser-host] write to disk failed:", p, err);
        throw err;
      }
    } else if (this.rootDirHandle) {
      // New file in a mounted workspace: create the file handle on demand.
      await this.createAndWriteUnderRoot(p, contents);
    }

    this.fireWatchers({
      kind: existing ? "modified" : "created",
      path: p,
    });
  }

  async writeBinaryFile(path: string, bytes: ArrayBuffer): Promise<void> {
    const p = normalize(path);
    this.ensureDir(parentOf(p));
    const existing = this.fs.get(p);
    this.fs.set(p, {
      kind: "file",
      bytes,
      size: bytes.byteLength,
      mtimeMs: Date.now(),
    });
    if (!existing) this.addChild(parentOf(p), p);

    const view = new Uint8Array(bytes);
    const handle = this.fileHandles.get(p);
    if (handle) {
      try {
        const stream = await handle.createWritable();
        await stream.write(view);
        await stream.close();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[browser-host] write to disk failed:", p, err);
        throw err;
      }
    } else if (this.rootDirHandle) {
      await this.createAndWriteUnderRoot(p, view);
    }

    this.fireWatchers({ kind: existing ? "modified" : "created", path: p });
  }

  async exists(path: string): Promise<boolean> {
    return this.fs.has(normalize(path));
  }

  async mkdir(path: string): Promise<void> {
    this.ensureDir(normalize(path));
  }

  async rename(from: string, to: string): Promise<void> {
    const src = normalize(from);
    const dst = normalize(to);
    const node = this.fs.get(src);
    if (!node) throw new Error(`rename: source not found: ${from}`);
    this.ensureDir(parentOf(dst));
    this.fs.set(dst, { ...node, mtimeMs: Date.now() } as FsNode);
    this.addChild(parentOf(dst), dst);
    this.removeChild(parentOf(src), src);
    this.fs.delete(src);
    this.fireWatchers({ kind: "renamed", path: dst, oldPath: src });
  }

  async remove(path: string): Promise<void> {
    const p = normalize(path);
    const node = this.fs.get(p);
    if (!node) return;
    if (node.kind === "dir" && node.children.size > 0) {
      throw new Error(`remove: directory not empty: ${path}`);
    }
    this.removeChild(parentOf(p), p);
    this.fs.delete(p);
    this.fireWatchers({ kind: "removed", path: p });
  }

  async revealInExplorer(path: string): Promise<void> {
    // No-op in browser mode. Stored for test assertion.
    // eslint-disable-next-line no-console
    console.log(`[browser-host] revealInExplorer: ${path}`);
  }

  async watchDir(
    path: string,
    onChange: (event: WatchEvent) => void,
  ): Promise<() => void> {
    const p = normalize(path);
    let set = this.watchers.get(p);
    if (!set) {
      set = new Set();
      this.watchers.set(p, set);
    }
    set.add(onChange);
    return () => set!.delete(onChange);
  }

  async readAudioBlob(path: string): Promise<Blob> {
    const node = this.fs.get(normalize(path));
    if (!node || node.kind !== "file" || !node.bytes) {
      // Empty wav — wavesurfer will show zero duration, which is fine for tests
      return new Blob([new ArrayBuffer(0)], { type: "audio/wav" });
    }
    return new Blob([node.bytes], { type: "audio/wav" });
  }

  async discoverPlugins(_dataDir: string): Promise<string[]> {
    return [...this.plugins];
  }

  // ---------- File System Access API: mount a real directory ----------

  /**
   * Walks a DirectoryHandle recursively, seeding every file into the
   * in-memory FS and stashing each FileHandle so writes can flow back to
   * disk. Uses a synthetic root path derived from the picked folder's name
   * since the API doesn't expose absolute paths.
   */
  private async mountDirectoryHandle(root: FSDirHandle): Promise<void> {
    this.fs.clear();
    this.watchers.clear();
    this.fileHandles.clear();
    this.fs.set("/", { kind: "dir", children: new Set(), mtimeMs: Date.now() });

    const rootPath = `/${root.name}`;
    this.ensureDir(rootPath);
    this.pickedFolder = rootPath;
    this.rootDirHandle = root;

    // Permission handshake (required for writes).
    if (root.requestPermission) {
      const perm = await root.requestPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        // eslint-disable-next-line no-console
        console.warn("[browser-host] readwrite permission denied");
      }
    }

    const visit = async (dir: FSDirHandle, dirPath: string): Promise<void> => {
      const children: Promise<void>[] = [];
      for await (const [name, handle] of dir.entries()) {
        const childPath = `${dirPath}/${name}`;
        if (handle.kind === "directory") {
          this.ensureDir(childPath);
          children.push(visit(handle as FSDirHandle, childPath));
        } else {
          children.push(this.ingestFile(handle as FSFileHandle, childPath));
        }
      }
      await Promise.all(children);
    };
    await visit(root, rootPath);
  }

  private async ingestFile(
    handle: FSFileHandle,
    path: string,
  ): Promise<void> {
    try {
      const file = await handle.getFile();
      const isText = /\.(json|txt|md|ini)$/i.test(path);
      const node: FsNode = isText
        ? {
            kind: "file",
            text: await file.text(),
            size: file.size,
            mtimeMs: file.lastModified || Date.now(),
          }
        : {
            kind: "file",
            bytes: await file.arrayBuffer(),
            size: file.size,
            mtimeMs: file.lastModified || Date.now(),
          };
      this.fs.set(path, node);
      this.addChild(parentOf(path), path);
      this.fileHandles.set(path, handle);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[browser-host] failed to ingest:", path, err);
    }
  }

  private async createAndWriteUnderRoot(
    absPath: string,
    contents: string | BufferSource | Blob,
  ): Promise<void> {
    if (!this.rootDirHandle || !this.pickedFolder) return;
    if (!absPath.startsWith(this.pickedFolder + "/")) return;
    const relParts = absPath.slice(this.pickedFolder.length + 1).split("/");
    const fileName = relParts.pop();
    if (!fileName) return;
    let dir: FSDirHandle = this.rootDirHandle;
    for (const seg of relParts) {
      dir = await dir.getDirectoryHandle(seg, { create: true });
    }
    const fh = await dir.getFileHandle(fileName, { create: true });
    const stream = await fh.createWritable();
    await stream.write(contents);
    await stream.close();
    this.fileHandles.set(absPath, fh);
  }

  // ---------- Internal helpers ----------

  private ensureDir(path: string): void {
    const p = normalize(path);
    if (this.fs.has(p)) return;
    if (p !== "/") this.ensureDir(parentOf(p));
    this.fs.set(p, {
      kind: "dir",
      children: new Set(),
      mtimeMs: Date.now(),
    });
    if (p !== "/") this.addChild(parentOf(p), p);
  }

  private addChild(parent: string, child: string): void {
    const node = this.fs.get(parent);
    if (node?.kind === "dir") node.children.add(child);
  }

  private removeChild(parent: string, child: string): void {
    const node = this.fs.get(parent);
    if (node?.kind === "dir") node.children.delete(child);
  }

  private fireWatchers(ev: WatchEvent): void {
    for (const [dir, set] of this.watchers.entries()) {
      if (ev.path === dir || ev.path.startsWith(dir + "/")) {
        for (const cb of set) cb(ev);
      }
    }
  }
}

// ---------- Global seeding hook ----------

declare global {
  interface Window {
    __browserHost?: BrowserHost;
    __seedWorkspace?: (seed: SeedWorkspace) => void;
  }
}

/** Installs the singleton browser-host onto window for tests + Claude. */
export function installBrowserHost(host: BrowserHost): void {
  if (typeof window !== "undefined") {
    window.__browserHost = host;
    window.__seedWorkspace = (seed) => host.seedWorkspace(seed);
  }
}
