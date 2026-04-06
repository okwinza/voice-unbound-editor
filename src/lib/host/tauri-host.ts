/**
 * TauriHost — production filesystem backing via @tauri-apps/plugin-fs.
 *
 * This module imports Tauri APIs lazily so it doesn't break `dev:browser`
 * (where Tauri isn't injected into window). The imports resolve to browser
 * stubs when running outside a Tauri webview, but we never construct this
 * class in that case — host/index.ts picks BrowserHost based on
 * VITE_BROWSER_MODE.
 */

import * as fs from "@tauri-apps/plugin-fs";
import * as dialog from "@tauri-apps/plugin-dialog";
import * as shell from "@tauri-apps/plugin-shell";
import type {
  FileEntry,
  HostBackend,
  WatchEvent,
  WatchEventKind,
} from "./types";

export class TauriHost implements HostBackend {
  readonly kind = "tauri" as const;

  async pickFolder(): Promise<string | null> {
    const selected = await dialog.open({
      directory: true,
      multiple: false,
      title: "Open Voice Unbound workspace",
    });
    return typeof selected === "string" ? selected : null;
  }

  async readDir(path: string): Promise<FileEntry[]> {
    const entries = await fs.readDir(path);
    return entries.map((e) => ({
      path: `${path}${path.endsWith("/") || path.endsWith("\\") ? "" : "/"}${e.name}`,
      name: e.name,
      kind: e.isDirectory ? "dir" : "file",
    }));
  }

  async readDirRecursive(path: string): Promise<FileEntry[]> {
    const out: FileEntry[] = [];
    const visit = async (dir: string): Promise<void> => {
      const entries = await this.readDir(dir);
      out.push(...entries);
      await Promise.all(
        entries.filter((e) => e.kind === "dir").map((e) => visit(e.path)),
      );
    };
    await visit(path);
    return out;
  }

  async readTextFile(path: string): Promise<string> {
    return fs.readTextFile(path);
  }

  async writeTextFile(path: string, contents: string): Promise<void> {
    // Atomic write: temp file + rename. Temp file is cleaned up on failure.
    const tmp = `${path}.tmp-${Date.now()}`;
    try {
      await fs.writeTextFile(tmp, contents);
      await fs.rename(tmp, path);
    } catch (err) {
      try {
        await fs.remove(tmp);
      } catch {
        /* ignore */
      }
      throw err;
    }
  }

  async writeBinaryFile(path: string, bytes: ArrayBuffer): Promise<void> {
    await fs.writeFile(path, new Uint8Array(bytes));
  }

  async exists(path: string): Promise<boolean> {
    return fs.exists(path);
  }

  async mkdir(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }

  async rename(from: string, to: string): Promise<void> {
    await fs.rename(from, to);
  }

  async remove(path: string): Promise<void> {
    await fs.remove(path);
  }

  async revealInExplorer(path: string): Promise<void> {
    // Windows: `explorer /select,` works on files and folders.
    const cmd = shell.Command.create("explorer", ["/select,", path]);
    await cmd.execute();
  }

  async watchDir(
    path: string,
    onChange: (event: WatchEvent) => void,
  ): Promise<() => void> {
    const unwatch = await fs.watch(
      path,
      (event) => {
        // Tauri fs emits an event with a `paths: string[]` and `type` kind.
        // We flatten to a per-path WatchEvent. Best-effort kind mapping.
        const kind = mapWatchKind(event.type);
        for (const p of event.paths) {
          onChange({ kind, path: p });
        }
      },
      { recursive: true },
    );
    return unwatch;
  }

  async readAudioBlob(path: string): Promise<Blob> {
    const bytes = await fs.readFile(path);
    return new Blob([new Uint8Array(bytes)], { type: "audio/wav" });
  }

  async discoverPlugins(dataDir: string): Promise<string[]> {
    // Prefer loadorder.txt (MO2/Vortex) if present — it's the source of truth
    // for enabled plugins in the user's current load order.
    try {
      const loadOrderPath = `${dataDir}/../loadorder.txt`;
      const text = await fs.readTextFile(loadOrderPath);
      return parsePluginList(text);
    } catch {
      /* fall through to glob scan */
    }

    // Fallback: scan Data/*.{esp,esm,esl}
    try {
      const entries = await fs.readDir(dataDir);
      return entries
        .filter((e) => !e.isDirectory && /\.(esp|esm|esl)$/i.test(e.name))
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }
}

function mapWatchKind(t: unknown): WatchEventKind {
  // Tauri fs event types vary by platform; keep mapping loose.
  if (typeof t === "string") {
    const s = t.toLowerCase();
    if (s.includes("create")) return "created";
    if (s.includes("remove") || s.includes("delete")) return "removed";
    if (s.includes("rename")) return "renamed";
  }
  return "modified";
}

function parsePluginList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return null;
      // MO2/Vortex prefix active plugins with `*`
      return trimmed.replace(/^\*/, "");
    })
    .filter((l): l is string => !!l);
}
