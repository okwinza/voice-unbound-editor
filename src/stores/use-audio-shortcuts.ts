import { useEffect } from "react";
import { AudioPlayer } from "@/lib/audio";
import { isEditableTarget } from "@/lib/keyboard";
import { folderOf, wavPathFor } from "@/lib/paths";
import { useWorkspaceStore } from "./workspace-store";

/**
 * Global Space / Shift+Space keyboard shortcuts:
 *   Space       → play/stop the currently-active tab's wav
 *   Shift+Space → play the next line in the same folder (walking auditioner)
 *
 * Ignored when focus is in an editable element so typing isn't hijacked.
 */
export function useAudioShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isEditableTarget(e)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const { activeTab, fileList, treeSelection } = useWorkspaceStore.getState();
      const focused = treeSelection ?? activeTab;
      if (!focused) return;

      if (e.shiftKey) {
        const folder = folderOf(focused);
        const siblings = fileList.filter((p) => folderOf(p) === folder);
        const idx = siblings.indexOf(focused);
        if (idx < 0) return;
        const next = siblings[(idx + 1) % siblings.length];
        e.preventDefault();
        useWorkspaceStore.getState().selectInTree(next);
        void AudioPlayer.play(wavPathFor(next));
      } else {
        e.preventDefault();
        void AudioPlayer.toggle(wavPathFor(focused));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
