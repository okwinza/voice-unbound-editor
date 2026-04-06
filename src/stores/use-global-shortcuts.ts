import { useEffect } from "react";
import { isEditableTarget } from "@/lib/keyboard";
import { useUiStore } from "./ui-store";
import { useWorkspaceStore } from "./workspace-store";

/**
 * App-wide keyboard shortcuts that don't belong to a specific component.
 *   Ctrl/Cmd+S         save active tab
 *   Ctrl/Cmd+Shift+S   save all
 *   Ctrl/Cmd+J         toggle Inspector sheet
 *   Ctrl/Cmd+K         toggle Command palette
 *   Ctrl/Cmd+Shift+F   toggle Workspace search panel
 *   Ctrl/Cmd+Shift+H   toggle Find/Replace dialog
 *   Ctrl/Cmd+Shift+Z   toggle Workspace undo drawer (cross-file save history)
 *   Ctrl/Cmd+D         duplicate active tab
 *   F2                 rename selected tree file
 *   ?                  shortcuts overlay
 *   Escape             handled by each sheet/dialog
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "s") {
        e.preventDefault();
        const ws = useWorkspaceStore.getState();
        if (e.shiftKey) void ws.saveAll();
        else if (ws.activeTab) void ws.saveDocument(ws.activeTab);
        return;
      }

      if (mod && key === "j") {
        e.preventDefault();
        useUiStore.getState().toggleInspector();
        return;
      }

      if (mod && key === "k") {
        e.preventDefault();
        useUiStore.getState().toggleCommandPalette();
        return;
      }

      if (mod && e.shiftKey && key === "f") {
        e.preventDefault();
        useUiStore.getState().toggleWorkspaceSearch();
        return;
      }

      if (mod && e.shiftKey && key === "z") {
        e.preventDefault();
        useUiStore.getState().toggleWorkspaceUndoDrawer();
        return;
      }

      if (mod && e.shiftKey && key === "h") {
        e.preventDefault();
        useUiStore.getState().toggleFindReplace();
        return;
      }

      if (mod && key === "d" && !e.shiftKey && !isEditableTarget(e)) {
        e.preventDefault();
        const ws = useWorkspaceStore.getState();
        if (ws.activeTab) void ws.duplicateFile(ws.activeTab);
        return;
      }

      if (e.key === "F2" && !isEditableTarget(e)) {
        const ws = useWorkspaceStore.getState();
        const target = ws.treeSelection ?? ws.activeTab;
        if (target) {
          e.preventDefault();
          ws.startRename(target);
        }
        return;
      }

      if (e.key === "?" && !mod && !isEditableTarget(e)) {
        e.preventDefault();
        useUiStore.getState().toggleShortcutsOverlay();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
