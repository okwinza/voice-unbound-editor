import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { Search, FileText, Sparkles, ArrowRight } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AudioPlayer } from "@/lib/audio";
import { EVENT_META, type EventMeta } from "@/lib/event-meta";
import { isKnownEvent } from "@/lib/enums";
import { extractEventName, extractSubtitle } from "@/lib/dom-accessors";
import { basename, stemOf } from "@/lib/paths";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";

type CommandKind = "file" | "action";

interface CommandItem {
  kind: CommandKind;
  id: string;
  label: string;
  sub?: string;
  eventMeta?: EventMeta;
  run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const close = useUiStore((s) => s.closeCommandPalette);

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileList = useWorkspaceStore((s) => s.fileList);
  const documents = useWorkspaceStore((s) => s.documents);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const saveAll = useWorkspaceStore((s) => s.saveAll);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const toggleInspector = useUiStore((s) => s.toggleInspector);
  const toggleShortcutsOverlay = useUiStore((s) => s.toggleShortcutsOverlay);
  const toggleWorkspaceSearch = useUiStore((s) => s.toggleWorkspaceSearch);
  const toggleWorkspaceUndoDrawer = useUiStore((s) => s.toggleWorkspaceUndoDrawer);
  const toggleFindReplace = useUiStore((s) => s.toggleFindReplace);
  const toggleBulkEdit = useUiStore((s) => s.toggleBulkEdit);
  const toggleSchemaSheet = useUiStore((s) => s.toggleSchemaSheet);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Build items only when the palette is open — avoids per-keystroke
  // work in the editor when the palette is closed.
  const items = useMemo<CommandItem[]>(() => {
    if (!open) return [];
    const actions: CommandItem[] = [
      { kind: "action", id: "action-save-all", label: "Save all", sub: "Ctrl+Shift+S", run: () => void saveAll() },
      { kind: "action", id: "action-toggle-inspector", label: "Toggle Inspector", sub: "Ctrl+J", run: () => toggleInspector() },
      { kind: "action", id: "action-search-workspace", label: "Search workspace", sub: "Ctrl+Shift+F", run: () => toggleWorkspaceSearch() },
      { kind: "action", id: "action-workspace-undo", label: "Undo across files", sub: "Ctrl+Shift+Z", run: () => toggleWorkspaceUndoDrawer() },
      { kind: "action", id: "action-find-replace", label: "Find & replace", sub: "Ctrl+Shift+H", run: () => toggleFindReplace() },
      { kind: "action", id: "action-bulk-edit", label: "Bulk edit", run: () => toggleBulkEdit() },
      { kind: "action", id: "action-schema-reference", label: "Schema reference", run: () => toggleSchemaSheet() },
      {
        kind: "action",
        id: "action-toggle-theme",
        label: `Theme: ${theme === "skyrim" ? "switch to Neutral" : "switch to Skyrim"}`,
        run: () => setTheme(theme === "skyrim" ? "neutral" : "skyrim"),
      },
      { kind: "action", id: "action-density-cozy", label: "Density: Cozy", sub: density === "cozy" ? "current" : undefined, run: () => setDensity("cozy") },
      { kind: "action", id: "action-density-comfortable", label: "Density: Comfortable", sub: density === "comfortable" ? "current" : undefined, run: () => setDensity("comfortable") },
      { kind: "action", id: "action-density-compact", label: "Density: Compact", sub: density === "compact" ? "current" : undefined, run: () => setDensity("compact") },
      { kind: "action", id: "action-shortcuts", label: "Keyboard shortcuts", sub: "?", run: () => toggleShortcutsOverlay() },
      { kind: "action", id: "action-stop-audio", label: "Stop playback", run: () => AudioPlayer.stop() },
    ];

    const files: CommandItem[] = fileList.map((p) => {
      const doc = documents.get(p);
      const eventName = extractEventName(doc?.dom);
      const subtitle = extractSubtitle(doc?.dom);
      const eventMeta =
        eventName && isKnownEvent(eventName) ? EVENT_META[eventName] : undefined;
      return {
        kind: "file",
        id: `file-${p}`,
        label: stemOf(basename(p)),
        sub: subtitle || eventName || undefined,
        eventMeta,
        run: () => openFile(p),
      };
    });

    return [...files, ...actions];
  }, [
    open,
    fileList,
    documents,
    saveAll,
    toggleInspector,
    theme,
    setTheme,
    density,
    setDensity,
    toggleShortcutsOverlay,
    toggleWorkspaceSearch,
    toggleWorkspaceUndoDrawer,
    toggleFindReplace,
    toggleBulkEdit,
    toggleSchemaSheet,
    openFile,
  ]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "label", weight: 2 },
          { name: "sub", weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [items],
  );

  const results = useMemo<CommandItem[]>(() => {
    if (!query.trim()) return items.slice(0, 40);
    return fuse.search(query).slice(0, 40).map((r) => r.item);
  }, [query, fuse, items]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const runItem = (item: CommandItem) => {
    item.run();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[cursor];
      if (item) runItem(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/60 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={close}
      data-testid="command-palette-backdrop"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-md border border-border bg-popover shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="command-palette"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to file or run an action…"
            className="mono flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
            data-testid="command-palette-input"
          />
          <span className="mono text-[10px] text-muted-foreground/60">
            {results.length}
          </span>
        </div>
        <ul className="max-h-[50vh] overflow-auto p-1" role="listbox" aria-label="Command results">
          {results.length === 0 ? (
            <li className="p-6 text-center text-[11px] text-muted-foreground">
              No matches.
            </li>
          ) : (
            results.map((item, i) => (
              <ResultRow
                key={item.id}
                item={item}
                active={i === cursor}
                onHover={() => setCursor(i)}
                onClick={() => runItem(item)}
              />
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-3 py-1 text-[10px] text-muted-foreground">
          <span className="flex gap-3">
            <span><Kbd size="sm">↑</Kbd><Kbd size="sm">↓</Kbd> navigate</span>
            <span><Kbd size="sm">↵</Kbd> run</span>
            <span><Kbd size="sm">Esc</Kbd> close</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="sm">Ctrl</Kbd><Kbd size="sm">K</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  item,
  active,
  onHover,
  onClick,
}: {
  item: CommandItem;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <li
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-1.5 text-[12px]",
        active ? "bg-accent text-accent-foreground" : "text-foreground/90",
      )}
      data-testid={`command-item-${item.id}`}
    >
      {item.kind === "file" ? (
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <span className={cn("mono truncate", item.kind === "file" && "font-medium")}>
        {item.label}
      </span>
      {item.eventMeta && (
        <span
          className={cn(
            "rounded-sm px-1 py-[1px] text-[9px] font-medium text-white/90",
            item.eventMeta.bgClass,
          )}
        >
          {item.eventMeta.label}
        </span>
      )}
      {item.sub && (
        <span className="truncate text-[10px] text-muted-foreground">{item.sub}</span>
      )}
      {active && <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />}
    </li>
  );
}
