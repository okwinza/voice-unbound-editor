import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Copy, FileText, ChevronDown } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { KNOWN_EVENTS, type EventName } from "@/lib/enums";
import { EVENT_META } from "@/lib/event-meta";
import { emptyVoiceLine } from "@/lib/schema";
import { folderOf, stemOf, basename } from "@/lib/paths";
import { cn } from "@/lib/cn";

/**
 * "+ New" dropdown on the tree toolbar. Two modes:
 *   - Duplicate current: clones the active tab, auto-increments the
 *     filename (okw_battlecry_01.json → _02.json), opens the clone.
 *   - New from event: creates an empty-but-valid VoiceLine scoped to
 *     the chosen event, filename "untitled_{event}_01.json" in the
 *     currently-selected file's folder or the workspace root.
 *
 * The dropdown renders via a portal with fixed positioning — the
 * sidebar clips `overflow: hidden`, so a normal absolute-positioned
 * menu would be cut off at the pane edge.
 */
export function NewFileMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const treeSelection = useWorkspaceStore((s) => s.treeSelection);
  const fileList = useWorkspaceStore((s) => s.fileList);
  const createFile = useWorkspaceStore((s) => s.createFile);
  const duplicateFile = useWorkspaceStore((s) => s.duplicateFile);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Pin menu's top-left corner below the trigger. If that would spill off
    // the right viewport edge, clamp with an 8px gutter.
    const menuWidth = 280;
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
    setCoords({ left, top: rect.bottom + 4 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!workspacePath) return null;

  const handleDuplicate = async () => {
    if (!activeTab) return;
    setOpen(false);
    await duplicateFile(activeTab);
  };

  const handleNewFromEvent = async (event: EventName) => {
    setOpen(false);
    const targetFolder =
      (treeSelection && folderOf(treeSelection)) ||
      (activeTab && folderOf(activeTab)) ||
      workspacePath;
    const prefix = `untitled_${event.toLowerCase()}_`;
    const siblingNames = new Set(
      fileList.filter((p) => folderOf(p) === targetFolder).map((p) => basename(p)),
    );
    let n = 1;
    let name = `${prefix}${String(n).padStart(2, "0")}.json`;
    while (siblingNames.has(name)) {
      n++;
      name = `${prefix}${String(n).padStart(2, "0")}.json`;
    }
    const newPath = `${targetFolder}/${name}`;
    await createFile(newPath, emptyVoiceLine(event));
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 rounded-sm border border-border px-2 text-xs transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
        title="New voice line (Ctrl+D to duplicate)"
        data-testid="new-file-trigger"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>New</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[70] w-[280px] rounded-md border border-border bg-popover p-1 shadow-2xl"
            style={{ left: coords.left, top: coords.top }}
            role="menu"
            data-testid="new-file-menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleDuplicate}
              disabled={!activeTab}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px]",
                activeTab
                  ? "hover:bg-accent hover:text-accent-foreground"
                  : "cursor-not-allowed opacity-40",
              )}
              data-testid="new-file-duplicate"
            >
              <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">
                Duplicate current
                {activeTab && (
                  <span className="mono ml-2 text-[10px] text-muted-foreground">
                    {stemOf(basename(activeTab))}
                  </span>
                )}
              </span>
              <span className="mono shrink-0 text-[10px] text-muted-foreground/60">
                Ctrl+D
              </span>
            </button>
            <div className="my-1 h-px bg-border" />
            <p className="font-display px-2 py-1 text-[9px] text-muted-foreground">
              Empty line — event
            </p>
            {KNOWN_EVENTS.map((event) => {
              const meta = EVENT_META[event];
              return (
                <button
                  key={event}
                  type="button"
                  role="menuitem"
                  onClick={() => void handleNewFromEvent(event)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent hover:text-accent-foreground"
                  data-testid={`new-file-event-${event}`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="mono flex-1 truncate font-medium">{event}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-1 py-[1px] text-[9px] font-medium text-white/90",
                      meta.bgClass,
                    )}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
