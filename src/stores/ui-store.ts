/**
 * UI store — theme, density, panel visibility, view mode.
 *
 * Persisted to localStorage so dev-loop + prod retain user preferences across
 * reloads. The <html> element's className mirrors theme + density.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "skyrim" | "neutral";
export type Density = "comfortable" | "cozy" | "compact";
export type ViewMode = "tree" | "list";
export type InspectorTab = "json" | "diff" | "schema" | "info";

interface UiState {
  theme: Theme;
  density: Density;
  viewMode: ViewMode;
  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  showSchemaSheet: boolean;
  showShortcutsOverlay: boolean;
  commandPaletteOpen: boolean;
  workspaceSearchOpen: boolean;
  workspaceUndoDrawerOpen: boolean;
  findReplaceOpen: boolean;
  bulkEditOpen: boolean;
  conflictDialogPath: string | null;

  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleInspector: () => void;
  setInspectorTab: (tab: InspectorTab) => void;
  toggleSchemaSheet: () => void;
  toggleShortcutsOverlay: () => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleWorkspaceSearch: () => void;
  closeWorkspaceSearch: () => void;
  toggleWorkspaceUndoDrawer: () => void;
  closeWorkspaceUndoDrawer: () => void;
  toggleFindReplace: () => void;
  closeFindReplace: () => void;
  toggleBulkEdit: () => void;
  closeBulkEdit: () => void;
  openConflictDialog: (path: string) => void;
  closeConflictDialog: () => void;
}

function applyClasses(theme: Theme, density: Density) {
  const root = document.documentElement;
  root.classList.remove("theme-neutral", "theme-skyrim");
  if (theme === "neutral") root.classList.add("theme-neutral");
  root.classList.remove("density-cozy", "density-comfortable", "density-compact");
  root.classList.add(`density-${density}`);
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "skyrim",
      density: "cozy",
      viewMode: "tree",
      inspectorOpen: false,
      inspectorTab: "json",
      showSchemaSheet: false,
      showShortcutsOverlay: false,
      commandPaletteOpen: false,
      workspaceSearchOpen: false,
      workspaceUndoDrawerOpen: false,
      findReplaceOpen: false,
      bulkEditOpen: false,
      conflictDialogPath: null,

      setTheme(theme) {
        set({ theme });
        applyClasses(theme, get().density);
      },
      setDensity(density) {
        set({ density });
        applyClasses(get().theme, density);
      },
      setViewMode(mode) {
        set({ viewMode: mode });
      },
      toggleInspector() {
        set((s) => ({ inspectorOpen: !s.inspectorOpen }));
      },
      setInspectorTab(tab) {
        set({ inspectorTab: tab, inspectorOpen: true });
      },
      toggleSchemaSheet() {
        set((s) => ({ showSchemaSheet: !s.showSchemaSheet }));
      },
      toggleShortcutsOverlay() {
        set((s) => ({ showShortcutsOverlay: !s.showShortcutsOverlay }));
      },
      toggleCommandPalette() {
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen }));
      },
      closeCommandPalette() {
        set({ commandPaletteOpen: false });
      },
      toggleWorkspaceSearch() {
        set((s) => ({ workspaceSearchOpen: !s.workspaceSearchOpen }));
      },
      closeWorkspaceSearch() {
        set({ workspaceSearchOpen: false });
      },
      toggleWorkspaceUndoDrawer() {
        set((s) => ({ workspaceUndoDrawerOpen: !s.workspaceUndoDrawerOpen }));
      },
      closeWorkspaceUndoDrawer() {
        set({ workspaceUndoDrawerOpen: false });
      },
      toggleFindReplace() {
        set((s) => ({ findReplaceOpen: !s.findReplaceOpen }));
      },
      closeFindReplace() {
        set({ findReplaceOpen: false });
      },
      toggleBulkEdit() {
        set((s) => ({ bulkEditOpen: !s.bulkEditOpen }));
      },
      closeBulkEdit() {
        set({ bulkEditOpen: false });
      },
      openConflictDialog(path) {
        set({ conflictDialogPath: path });
      },
      closeConflictDialog() {
        set({ conflictDialogPath: null });
      },
    }),
    {
      name: "voice-unbound-editor:ui",
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        viewMode: s.viewMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyClasses(state.theme, state.density);
      },
    },
  ),
);
