import { useEffect } from "react";
import { X, Undo2, History } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useWorkspaceStore, type RecentSave } from "@/stores/workspace-store";
import { basename, stemOf } from "@/lib/paths";
import { cn } from "@/lib/cn";

/**
 * Right-side drawer listing the last 50 saves across every file. Each
 * entry can be rolled back independently — clicking Undo writes its
 * prevRawJson back to disk and removes the entry from the list.
 */
export function WorkspaceUndoDrawer() {
  const open = useUiStore((s) => s.workspaceUndoDrawerOpen);
  const close = useUiStore((s) => s.closeWorkspaceUndoDrawer);
  const recentSaves = useWorkspaceStore((s) => s.recentSaves);
  const workspaceUndoSave = useWorkspaceStore((s) => s.workspaceUndoSave);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={close}
      data-testid="workspace-undo-backdrop"
    >
      <div
        className="absolute inset-y-0 right-0 flex w-[360px] flex-col border-l border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recent saves"
        data-testid="workspace-undo-drawer"
      >
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-display text-[12px] text-foreground">
              Recent saves
            </span>
            <span className="mono text-[10px] text-muted-foreground">
              {recentSaves.length}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
            data-testid="workspace-undo-close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {recentSaves.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No recent saves
              </p>
              <p className="text-xs text-muted-foreground/70">
                Save a file and it'll show up here with an Undo option.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentSaves.map((entry) => (
                <RecentSaveRow
                  key={entry.id}
                  entry={entry}
                  onUndo={() => void workspaceUndoSave(entry.id)}
                />
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          Ctrl+Shift+Z toggles this drawer. Entries are consumed on undo.
        </footer>
      </div>
    </div>
  );
}

function RecentSaveRow({
  entry,
  onUndo,
}: {
  entry: RecentSave;
  onUndo: () => void;
}) {
  const lineDelta = countLineDelta(entry.prevRawJson, entry.newRawJson);
  return (
    <li
      className="flex items-center gap-2 px-3 py-2"
      data-testid={`workspace-undo-row-${entry.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="mono truncate text-[11px] font-medium text-foreground">
          {stemOf(basename(entry.path))}
        </div>
        <div className="flex items-baseline gap-2 text-[10px] text-muted-foreground">
          <span>{formatRelative(entry.savedAt)}</span>
          {lineDelta && (
            <span className="mono text-muted-foreground/70">{lineDelta}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onUndo}
        className={cn(
          "flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px]",
          "text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary",
        )}
        title="Undo this save"
        data-testid={`workspace-undo-apply-${entry.id}`}
      >
        <Undo2 className="h-3 w-3" />
        Undo
      </button>
    </li>
  );
}

function countLineDelta(prev: string, next: string): string | null {
  const a = prev.split("\n").length;
  const b = next.split("\n").length;
  const delta = b - a;
  if (delta === 0) return null;
  return delta > 0 ? `+${delta} line${delta === 1 ? "" : "s"}` : `${delta} lines`;
}

function formatRelative(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
