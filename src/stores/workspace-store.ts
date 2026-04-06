/**
 * Workspace store — the core editor state.
 *
 * Holds:
 *   - open workspace path
 *   - per-path Document (DOM, dirty, undo/redo stacks, validation issues)
 *   - open tabs, active tab, file tree selection
 *   - workspace-wide validation summary
 *
 * Keeps the DOM (raw JSON object) as the source of truth. Zod-parsed view and
 * validation issues are derived whenever the DOM changes.
 */

import { create } from "zustand";
import { getHost } from "@/lib/host";
import { parseJsonSafe, serialize } from "@/lib/json-io";
import {
  validateDocument,
  type ValidationIssue,
} from "@/lib/validator";
import { nextFilename } from "@/lib/filename";
import { basename, folderOf } from "@/lib/paths";
import { readDotPath, writeDotPath } from "@/lib/dot-path";
import { rollBackup } from "@/lib/backup";
import { useUiStore } from "./ui-store";

export interface Document {
  path: string;
  rawJson: string;
  /** Last content known to be on disk — restored by revert, pushed into
   *  recentSaves on every save so workspaceUndo can roll back to it. */
  baseline: string;
  dom: unknown;
  issues: ValidationIssue[];
  dirty: boolean;
  undoStack: string[];
  redoStack: string[];
}

export interface BulkEditResult {
  changedPaths: string[];
  /** Paths skipped because the field was already at the target value. */
  unchangedPaths: string[];
  /** Paths whose DOM wasn't a plain object (cannot patch). */
  skippedPaths: string[];
}

export interface FindReplaceResult {
  /** Files whose content was successfully changed + saved. */
  changedPaths: string[];
  /** Files that matched but whose replacement produced invalid JSON (skipped). */
  skippedPaths: string[];
  /** Total substring replacements made across all saved files. */
  totalReplacements: number;
}

/** One entry per save operation; workspaceUndo rewinds one entry at a time. */
export interface RecentSave {
  id: string;
  path: string;
  prevRawJson: string;
  newRawJson: string;
  savedAt: number;
}

const UNDO_CAP = 50;
const RECENT_SAVES_CAP = 50;

/** Watcher events within this window of a self-write are ignored. Covers
 *  the atomic temp+rename lag in tauri-host's writeTextFile. */
const SELF_WRITE_SUPPRESS_MS = 300;
/** Beyond this the entry can't possibly suppress a watcher event anymore;
 *  used to evict stale entries from lastSelfWriteAt on insert. */
const SELF_WRITE_STALE_MS = SELF_WRITE_SUPPRESS_MS * 10;

export type DocumentStatus = "clean" | "unsaved" | "warnings" | "errors" | "invalid";

interface WorkspaceState {
  workspacePath: string | null;
  documents: Map<string, Document>;
  fileList: string[];
  openTabs: string[];
  activeTab: string | null;
  treeSelection: string | null;
  renamingPath: string | null;
  isLoading: boolean;
  loadError: string | null;
  recentSaves: RecentSave[];
  /** Paths modified on disk since last load/save for a dirty document —
   *  next save on these paths prompts the conflict dialog. */
  staleExternalPaths: Set<string>;
  /** Most-recent self-write timestamp per path (ms since epoch). The
   *  workspace watcher suppresses events within SELF_WRITE_SUPPRESS_MS
   *  of this timestamp so our own writes don't self-trigger conflicts. */
  lastSelfWriteAt: Map<string, number>;

  // Derived / helper getters (computed on read to keep them fresh)
  getStatus: (path: string) => DocumentStatus;

  // Workspace ops
  openWorkspace: (path: string) => Promise<void>;
  closeWorkspace: () => void;

  // Tab ops
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  switchTab: (path: string) => void;
  selectInTree: (path: string | null) => void;

  // Rename flow
  startRename: (path: string) => void;
  cancelRename: () => void;

  // External-edit tracking
  markStale: (path: string) => void;
  clearStale: (path: string) => void;
  /** True if a watcher event fired for `path` more than
   *  SELF_WRITE_SUPPRESS_MS after our last self-write on that path. */
  isExternalEvent: (path: string) => boolean;
  /** Records the current timestamp as the last self-write for `path`. */
  noteSelfWrite: (path: string) => void;

  // Document ops
  updateDom: (path: string, dom: unknown) => void;
  patchDom: (path: string, patch: Partial<Record<string, unknown>>) => void;
  saveDocument: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;
  revertDocument: (path: string) => Promise<void>;
  undo: (path: string) => void;
  redo: (path: string) => void;
  workspaceUndoSave: (id: string) => Promise<void>;
  applyFindReplace: (
    find: string,
    replace: string,
    caseSensitive: boolean,
  ) => Promise<FindReplaceResult>;
  applyBulkEdit: (
    paths: readonly string[],
    field: string,
    value: string | number | boolean | undefined,
  ) => Promise<BulkEditResult>;

  // File ops
  createFile: (path: string, dom: unknown) => Promise<void>;
  duplicateFile: (path: string) => Promise<string | null>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
}

function buildDocument(path: string, rawJson: string): Document {
  const parsed = parseJsonSafe(rawJson);
  const dom = parsed.ok ? parsed.value : null;
  const issues = parsed.ok
    ? validateDocument(parsed.value).issues
    : [
        {
          severity: "error" as const,
          message: `Cannot parse JSON: ${parsed.error}`,
          path: "",
        },
      ];
  return {
    path,
    rawJson,
    baseline: rawJson,
    dom,
    issues,
    dirty: false,
    undoStack: [],
    redoStack: [],
  };
}

function nextSaveId(): string {
  return `save-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function countMatches(haystack: string, needle: string, caseSensitive: boolean): number {
  if (!needle) return 0;
  const h = caseSensitive ? haystack : haystack.toLowerCase();
  const n = caseSensitive ? needle : needle.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = h.indexOf(n, idx)) !== -1) {
    count++;
    idx += n.length;
  }
  return count;
}

function replaceAll(text: string, find: string, replace: string, caseSensitive: boolean): string {
  if (!find) return text;
  if (caseSensitive) return text.split(find).join(replace);
  // Case-insensitive: walk match positions on the lowered string and
  // splice originals into the output (preserves non-matching case).
  const lowered = text.toLowerCase();
  const lfind = find.toLowerCase();
  let out = "";
  let prev = 0;
  let idx = 0;
  while ((idx = lowered.indexOf(lfind, idx)) !== -1) {
    out += text.slice(prev, idx) + replace;
    idx += lfind.length;
    prev = idx;
  }
  out += text.slice(prev);
  return out;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => {
  // Thin wrappers around host writes that record a self-write timestamp
  // first, so the workspace watcher can distinguish our writes from
  // external edits. Every path that flows through these is protected
  // against self-conflict for SELF_WRITE_SUPPRESS_MS.
  const selfWriteText = async (path: string, contents: string): Promise<void> => {
    get().noteSelfWrite(path);
    await getHost().writeTextFile(path, contents);
  };
  const selfRename = async (from: string, to: string): Promise<void> => {
    get().noteSelfWrite(from);
    get().noteSelfWrite(to);
    await getHost().rename(from, to);
  };
  const selfRemove = async (path: string): Promise<void> => {
    get().noteSelfWrite(path);
    await getHost().remove(path);
  };

  return {
  workspacePath: null,
  documents: new Map(),
  fileList: [],
  openTabs: [],
  activeTab: null,
  treeSelection: null,
  renamingPath: null,
  isLoading: false,
  loadError: null,
  recentSaves: [],
  staleExternalPaths: new Set(),
  lastSelfWriteAt: new Map(),

  getStatus(path) {
    const doc = get().documents.get(path);
    if (!doc) return "clean";
    if (doc.dom === null) return "invalid";
    const hasError = doc.issues.some((i) => i.severity === "error");
    const hasWarn = doc.issues.some((i) => i.severity === "warning");
    if (doc.dirty) return "unsaved";
    if (hasError) return "errors";
    if (hasWarn) return "warnings";
    return "clean";
  },

  async openWorkspace(path: string) {
    set({ isLoading: true, loadError: null });
    try {
      const host = getHost();
      const entries = await host.readDirRecursive(path);
      const jsonFiles = entries.filter(
        (e) => e.kind === "file" && e.name.endsWith(".json"),
      );

      const documents = new Map<string, Document>();
      const contents = await Promise.all(
        jsonFiles.map((f) => host.readTextFile(f.path)),
      );
      jsonFiles.forEach((f, i) => {
        documents.set(f.path, buildDocument(f.path, contents[i]));
      });

      set({
        workspacePath: path,
        documents,
        fileList: jsonFiles.map((f) => f.path).sort(),
        openTabs: [],
        activeTab: null,
        treeSelection: null,
        isLoading: false,
        recentSaves: [],
        staleExternalPaths: new Set(),
        lastSelfWriteAt: new Map(),
      });
    } catch (err) {
      set({
        isLoading: false,
        loadError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  closeWorkspace() {
    set({
      workspacePath: null,
      documents: new Map(),
      fileList: [],
      openTabs: [],
      activeTab: null,
      treeSelection: null,
      loadError: null,
      recentSaves: [],
      staleExternalPaths: new Set(),
      lastSelfWriteAt: new Map(),
    });
  },

  openFile(path) {
    const { documents, openTabs } = get();
    if (!documents.has(path)) return;
    const tabs = openTabs.includes(path) ? openTabs : [...openTabs, path];
    set({ openTabs: tabs, activeTab: path, treeSelection: path });
  },

  closeTab(path) {
    const { openTabs, activeTab } = get();
    const i = openTabs.indexOf(path);
    if (i < 0) return;
    const next = openTabs.filter((p) => p !== path);
    let newActive = activeTab;
    if (activeTab === path) {
      newActive = next[Math.min(i, next.length - 1)] ?? null;
    }
    set({ openTabs: next, activeTab: newActive });
  },

  switchTab(path) {
    if (!get().openTabs.includes(path)) return;
    set({ activeTab: path, treeSelection: path });
  },

  selectInTree(path) {
    set({ treeSelection: path });
  },

  startRename(path) {
    if (get().fileList.includes(path)) set({ renamingPath: path });
  },
  cancelRename() {
    set({ renamingPath: null });
  },

  markStale(path) {
    const current = get().staleExternalPaths;
    if (current.has(path)) return;
    const next = new Set(current);
    next.add(path);
    set({ staleExternalPaths: next });
  },
  clearStale(path) {
    const current = get().staleExternalPaths;
    if (!current.has(path)) return;
    const next = new Set(current);
    next.delete(path);
    set({ staleExternalPaths: next });
  },
  isExternalEvent(path) {
    const ts = get().lastSelfWriteAt.get(path);
    if (ts === undefined) return true;
    return Date.now() - ts > SELF_WRITE_SUPPRESS_MS;
  },
  noteSelfWrite(path) {
    // Mutate in place — this Map isn't a reactive slice, only read via
    // isExternalEvent() from the watcher handler. Avoids needless renders.
    const now = Date.now();
    const map = get().lastSelfWriteAt;
    map.set(path, now);
    // Prune entries so old enough that they can't suppress anything.
    // Bounded O(n) sweep, amortised cheap because writes are bursty.
    for (const [p, ts] of map) {
      if (now - ts > SELF_WRITE_STALE_MS) map.delete(p);
    }
  },

  updateDom(path, dom) {
    const doc = get().documents.get(path);
    if (!doc) return;

    const rawJson = serialize(dom);
    if (rawJson === doc.rawJson && !doc.dirty) return;

    const undoStack = [...doc.undoStack, doc.rawJson].slice(-UNDO_CAP);
    const issues = validateDocument(dom).issues;

    const next = new Map(get().documents);
    next.set(path, {
      ...doc,
      dom,
      rawJson,
      issues,
      dirty: true,
      undoStack,
      redoStack: [],
    });
    set({ documents: next });
  },

  patchDom(path, patch) {
    const doc = get().documents.get(path);
    if (!doc || typeof doc.dom !== "object" || doc.dom === null) return;
    const base = doc.dom as Record<string, unknown>;
    const next: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    get().updateDom(path, next);
  },

  async saveDocument(path) {
    const doc = get().documents.get(path);
    if (!doc || !doc.dirty) return;
    // Conflict guard: disk changed externally while we held edits —
    // defer the write and let the user pick Reload/Overwrite/Diff.
    if (get().staleExternalPaths.has(path)) {
      useUiStore.getState().openConflictDialog(path);
      return;
    }
    const workspaceRoot = get().workspacePath;
    // Roll the last-saved content into .voice-unbound-editor/backups/
    // before we overwrite. Non-blocking — backup failures never gate a save.
    if (workspaceRoot && doc.baseline) {
      void rollBackup(getHost(), workspaceRoot, path, doc.baseline);
    }
    await selfWriteText(path, doc.rawJson);
    const next = new Map(get().documents);
    next.set(path, { ...doc, dirty: false, baseline: doc.rawJson });
    // Only record non-trivial changes. Skips the odd case where a doc
    // is marked dirty but the serialized form equals what's already on disk.
    const recentSaves =
      doc.baseline === doc.rawJson
        ? get().recentSaves
        : [
            {
              id: nextSaveId(),
              path,
              prevRawJson: doc.baseline,
              newRawJson: doc.rawJson,
              savedAt: Date.now(),
            },
            ...get().recentSaves,
          ].slice(0, RECENT_SAVES_CAP);
    set({ documents: next, recentSaves });
  },

  async saveAll() {
    const dirty = [...get().documents.values()].filter((d) => d.dirty);
    await Promise.all(dirty.map((d) => get().saveDocument(d.path)));
  },

  async revertDocument(path) {
    const doc = get().documents.get(path);
    if (!doc) return;
    const host = getHost();
    const rawJson = await host.readTextFile(path);
    const next = new Map(get().documents);
    next.set(path, buildDocument(path, rawJson));
    set({ documents: next });
  },

  async applyFindReplace(find, replace, caseSensitive) {
    const result: FindReplaceResult = {
      changedPaths: [],
      skippedPaths: [],
      totalReplacements: 0,
    };
    if (!find) return result;
    const documents = new Map(get().documents);
    const newSaves: RecentSave[] = [];

    for (const [path, doc] of documents) {
      const matches = countMatches(doc.rawJson, find, caseSensitive);
      if (matches === 0) continue;

      const nextRawJson = replaceAll(doc.rawJson, find, replace, caseSensitive);
      const parsed = parseJsonSafe(nextRawJson);
      if (!parsed.ok) {
        result.skippedPaths.push(path);
        continue;
      }

      // Persist via the host, then update the in-memory document so
      // validation + dirty + baseline all stay consistent.
      await selfWriteText(path, nextRawJson);
      const next = buildDocument(path, nextRawJson);
      documents.set(path, next);
      newSaves.unshift({
        id: nextSaveId(),
        path,
        prevRawJson: doc.baseline,
        newRawJson: nextRawJson,
        savedAt: Date.now(),
      });
      result.changedPaths.push(path);
      result.totalReplacements += matches;
    }

    if (newSaves.length > 0) {
      const recentSaves = [...newSaves, ...get().recentSaves].slice(
        0,
        RECENT_SAVES_CAP,
      );
      set({ documents, recentSaves });
    }
    return result;
  },

  async applyBulkEdit(paths, field, value) {
    const result: BulkEditResult = {
      changedPaths: [],
      unchangedPaths: [],
      skippedPaths: [],
    };
    const documents = new Map(get().documents);
    const newSaves: RecentSave[] = [];

    for (const path of paths) {
      const doc = documents.get(path);
      if (!doc || typeof doc.dom !== "object" || doc.dom === null) {
        result.skippedPaths.push(path);
        continue;
      }
      const base = doc.dom as Record<string, unknown>;
      const prevValue = readDotPath(base, field);
      if (prevValue === value) {
        result.unchangedPaths.push(path);
        continue;
      }
      const nextDom = writeDotPath(base, field, value);

      const nextRawJson = serialize(nextDom);
      if (nextRawJson === doc.baseline) {
        result.unchangedPaths.push(path);
        continue;
      }
      await selfWriteText(path, nextRawJson);
      const next = buildDocument(path, nextRawJson);
      documents.set(path, next);
      newSaves.unshift({
        id: nextSaveId(),
        path,
        prevRawJson: doc.baseline,
        newRawJson: nextRawJson,
        savedAt: Date.now(),
      });
      result.changedPaths.push(path);
    }

    if (newSaves.length > 0) {
      const recentSaves = [...newSaves, ...get().recentSaves].slice(
        0,
        RECENT_SAVES_CAP,
      );
      set({ documents, recentSaves });
    }
    return result;
  },

  async workspaceUndoSave(id) {
    const entry = get().recentSaves.find((s) => s.id === id);
    if (!entry) return;
    await selfWriteText(entry.path, entry.prevRawJson);
    // Drop the undone entry from the list — undoing is consumed.
    const recentSaves = get().recentSaves.filter((s) => s.id !== id);
    // Refresh doc state from the restored on-disk content.
    const existing = get().documents.get(entry.path);
    const next = new Map(get().documents);
    const rebuilt = buildDocument(entry.path, entry.prevRawJson);
    if (existing) {
      // Preserve per-file undo/redo stacks across workspace undo so the
      // user can still ctrl-z their in-memory edits if they want them back.
      next.set(entry.path, {
        ...rebuilt,
        undoStack: existing.undoStack,
        redoStack: existing.redoStack,
      });
    } else {
      next.set(entry.path, rebuilt);
    }
    set({ documents: next, recentSaves });
  },

  undo(path) {
    const doc = get().documents.get(path);
    if (!doc || doc.undoStack.length === 0) return;
    const prev = doc.undoStack[doc.undoStack.length - 1];
    const parsed = parseJsonSafe(prev);
    if (!parsed.ok) return;
    const next = new Map(get().documents);
    next.set(path, {
      ...doc,
      rawJson: prev,
      dom: parsed.value,
      issues: validateDocument(parsed.value).issues,
      undoStack: doc.undoStack.slice(0, -1),
      redoStack: [...doc.redoStack, doc.rawJson],
      dirty: true,
    });
    set({ documents: next });
  },

  redo(path) {
    const doc = get().documents.get(path);
    if (!doc || doc.redoStack.length === 0) return;
    const next_ = doc.redoStack[doc.redoStack.length - 1];
    const parsed = parseJsonSafe(next_);
    if (!parsed.ok) return;
    const next = new Map(get().documents);
    next.set(path, {
      ...doc,
      rawJson: next_,
      dom: parsed.value,
      issues: validateDocument(parsed.value).issues,
      undoStack: [...doc.undoStack, doc.rawJson],
      redoStack: doc.redoStack.slice(0, -1),
      dirty: true,
    });
    set({ documents: next });
  },

  async createFile(path, dom) {
    const rawJson = serialize(dom);
    await selfWriteText(path, rawJson);
    const doc = buildDocument(path, rawJson);
    const next = new Map(get().documents);
    next.set(path, doc);
    const fileList = [...get().fileList, path].sort();
    set({
      documents: next,
      fileList,
      openTabs: [...get().openTabs.filter((p) => p !== path), path],
      activeTab: path,
      treeSelection: path,
    });
  },

  async duplicateFile(path) {
    const doc = get().documents.get(path);
    if (!doc) return null;
    const folder = folderOf(path);
    const siblings = new Set(
      get()
        .fileList.filter((p) => folderOf(p) === folder)
        .map((p) => basename(p)),
    );
    const { name } = nextFilename(basename(path), siblings);
    const newPath = `${folder}/${name}`;
    const clonedDom =
      doc.dom !== null && typeof doc.dom === "object"
        ? JSON.parse(JSON.stringify(doc.dom))
        : doc.dom;
    await get().createFile(newPath, clonedDom);
    return newPath;
  },

  async deleteFile(path) {
    await selfRemove(path);
    const next = new Map(get().documents);
    next.delete(path);
    const { openTabs, activeTab } = get();
    const tabs = openTabs.filter((p) => p !== path);
    const newActive =
      activeTab === path ? (tabs[tabs.length - 1] ?? null) : activeTab;
    set({
      documents: next,
      fileList: get().fileList.filter((p) => p !== path),
      openTabs: tabs,
      activeTab: newActive,
      treeSelection: get().treeSelection === path ? null : get().treeSelection,
    });
  },

  async renameFile(oldPath, newPath) {
    await selfRename(oldPath, newPath);
    const doc = get().documents.get(oldPath);
    if (!doc) return;
    const next = new Map(get().documents);
    next.delete(oldPath);
    next.set(newPath, { ...doc, path: newPath });
    const tabs = get().openTabs.map((p) => (p === oldPath ? newPath : p));
    const activeTab =
      get().activeTab === oldPath ? newPath : get().activeTab;
    const treeSelection =
      get().treeSelection === oldPath ? newPath : get().treeSelection;
    set({
      documents: next,
      fileList: get()
        .fileList.map((p) => (p === oldPath ? newPath : p))
        .sort(),
      openTabs: tabs,
      activeTab,
      treeSelection,
      renamingPath: null,
    });
  },
  };
});
