/**
 * Host selector — reads VITE_BROWSER_MODE at module-load time to pick the
 * appropriate backend. Browser mode runs in Vite (no Tauri), Tauri mode runs
 * inside the native webview.
 *
 * TauriHost is imported lazily so that browser-mode builds don't crash at
 * import-time if the Tauri APIs aren't available.
 */

import type { HostBackend } from "./types";
import { BrowserHost, installBrowserHost } from "./browser-host";

const BROWSER_MODE = import.meta.env.VITE_BROWSER_MODE === "true";

let singleton: HostBackend | null = null;

export function getHost(): HostBackend {
  if (singleton) return singleton;

  if (BROWSER_MODE) {
    const host = new BrowserHost();
    installBrowserHost(host);
    singleton = host;
    // Make the singleton visible to tests + Claude via window.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[host] BrowserHost installed (VITE_BROWSER_MODE=true)");
    }
    return host;
  }

  throw new Error(
    "getHost() called in tauri mode before setupTauriHost() — call setupTauriHost() once from main.tsx before rendering.",
  );
}

/**
 * Async initialiser for Tauri mode. Call this once from main.tsx before
 * rendering, e.g.:
 *
 *   if (import.meta.env.VITE_BROWSER_MODE !== "true") await setupTauriHost();
 */
export async function setupTauriHost(): Promise<void> {
  if (BROWSER_MODE || singleton) return;
  const { TauriHost } = await import("./tauri-host");
  singleton = new TauriHost();
}

/** Test helper: reset the host singleton between specs. */
export function __resetHost(): void {
  singleton = null;
}

export { BrowserHost, installBrowserHost } from "./browser-host";
export type { HostBackend, FileEntry, WatchEvent, WatchEventKind } from "./types";
