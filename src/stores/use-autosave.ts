import { useEffect } from "react";
import { useWorkspaceStore } from "./workspace-store";

/**
 * Fires `saveDocument(path)` 2 seconds after the last edit for any dirty
 * document that has no validation errors. Warnings don't block autosave
 * (so the user still gets their "plugin will warn at runtime" feedback
 * on disk, matching what the plugin would see on reload).
 *
 * Each edit resets the timer for that path, so rapid typing never
 * produces spurious saves. Timers are cleared if validation regresses to
 * an error or the component unmounts.
 */
const AUTOSAVE_DEBOUNCE_MS = 2000;

export function useAutosave(): void {
  useEffect(() => {
    const timers = new Map<string, number>();

    const unsubscribe = useWorkspaceStore.subscribe((state, prev) => {
      if (state.documents === prev.documents) return;

      for (const [path, doc] of state.documents) {
        const prevDoc = prev.documents.get(path);
        if (prevDoc && prevDoc.rawJson === doc.rawJson && prevDoc.dirty === doc.dirty) {
          continue;
        }

        const existing = timers.get(path);
        if (existing !== undefined) {
          window.clearTimeout(existing);
          timers.delete(path);
        }

        if (!doc.dirty) continue;
        if (doc.issues.some((i) => i.severity === "error")) continue;
        if (doc.dom === null) continue;

        const capturedRawJson = doc.rawJson;
        const timer = window.setTimeout(() => {
          timers.delete(path);
          const now = useWorkspaceStore.getState().documents.get(path);
          if (!now || !now.dirty) return;
          if (now.rawJson !== capturedRawJson) return;
          if (now.issues.some((i) => i.severity === "error")) return;
          void useWorkspaceStore.getState().saveDocument(path);
        }, AUTOSAVE_DEBOUNCE_MS);
        timers.set(path, timer);
      }

      // Clean up timers for paths that no longer exist (deleted files).
      for (const [path, timer] of timers) {
        if (!state.documents.has(path)) {
          window.clearTimeout(timer);
          timers.delete(path);
        }
      }
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);
}
