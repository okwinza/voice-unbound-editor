import { useEffect } from "react";
import { getHost } from "@/lib/host";
import { DOT_DIR } from "@/lib/backup";
import { useWorkspaceStore } from "./workspace-store";
import type { WatchEvent } from "@/lib/host";

/**
 * Subscribes `host.watchDir(workspacePath, …)` whenever the open workspace
 * changes, and routes external file-change events into the document store:
 *
 *   - clean document → silent-reload via revertDocument
 *   - dirty document → markStale(path); next save opens FileConflictDialog
 *   - non-document paths (.wav, .voice-unbound-editor/**) → ignored
 *
 * Self-write events (within 300 ms of a saveDocument / createFile / etc.)
 * are filtered out via isExternalEvent(path) so our own writes never
 * mis-fire as external conflicts.
 */
export function useWorkspaceWatcher(): void {
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);

  useEffect(() => {
    if (!workspacePath) return;
    let cancelled = false;
    let unwatch: (() => void) | null = null;

    const handler = (event: WatchEvent) => {
      if (cancelled) return;
      // Filter out event kinds we don't care about.
      if (event.kind !== "modified" && event.kind !== "renamed") return;
      if (!isWatchedDocument(event.path)) return;

      const state = useWorkspaceStore.getState();
      if (!state.isExternalEvent(event.path)) return;
      const doc = state.documents.get(event.path);
      if (!doc) return;

      if (!doc.dirty) {
        // Clean doc — silent reload from disk. revertDocument will
        // rebuild the document from the new file content.
        void state.revertDocument(event.path);
      } else {
        // Dirty doc — defer to the conflict dialog on next save.
        state.markStale(event.path);
      }
    };

    void (async () => {
      try {
        const fn = await getHost().watchDir(workspacePath, handler);
        if (cancelled) {
          fn();
          return;
        }
        unwatch = fn;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[watcher] watchDir failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, [workspacePath]);
}

/** Only voice-line .json files under the workspace are tracked as
 *  documents. Skip backup siblings and anything non-JSON. */
function isWatchedDocument(path: string): boolean {
  if (!path.endsWith(".json")) return false;
  if (path.includes(`/${DOT_DIR}/`)) return false;
  return true;
}
