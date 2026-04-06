import { useEffect, useMemo, useState } from "react";
import { X, AlertTriangle, RefreshCw, Upload, GitCompare } from "lucide-react";
import { diffLines } from "diff";
import { useUiStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { getHost } from "@/lib/host";
import { basename, stemOf } from "@/lib/paths";
import { DiffChunk } from "@/components/ui/DiffChunk";

/**
 * Modal that opens when the user saves a dirty document whose file has
 * been modified on disk externally since last load. Three resolutions:
 *
 *   - Reload from disk → discard our edits, adopt external content
 *   - Overwrite → drop the stale flag + re-invoke saveDocument
 *   - Show external diff → fetch the on-disk content and render it
 *     side-by-side with the dirty rawJson
 */
export function FileConflictDialog() {
  const path = useUiStore((s) => s.conflictDialogPath);
  const close = useUiStore((s) => s.closeConflictDialog);
  const doc = useWorkspaceStore((s) => (path ? s.documents.get(path) : null));
  const revertDocument = useWorkspaceStore((s) => s.revertDocument);
  const saveDocument = useWorkspaceStore((s) => s.saveDocument);
  const clearStale = useWorkspaceStore((s) => s.clearStale);

  const [externalText, setExternalText] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const diffChanges = useMemo(
    () =>
      externalText !== null && doc
        ? diffLines(externalText, doc.rawJson)
        : null,
    [externalText, doc],
  );

  useEffect(() => {
    if (!path) return;
    setExternalText(null);
    setLoadingDiff(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, close]);

  if (!path || !doc) return null;

  const onReload = () => {
    void revertDocument(path);
    clearStale(path);
    close();
  };

  const onOverwrite = () => {
    clearStale(path);
    close();
    void saveDocument(path);
  };

  const onShowDiff = async () => {
    setLoadingDiff(true);
    try {
      const text = await getHost().readTextFile(path);
      setExternalText(text);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[conflict] failed to read external file:", err);
    } finally {
      setLoadingDiff(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={close}
      data-testid="conflict-dialog-backdrop"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-md border border-warning/60 bg-popover shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="File conflict"
        data-testid="conflict-dialog"
      >
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="font-display text-[12px] text-foreground">
              File changed on disk
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
            data-testid="conflict-dialog-close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="border-b border-border px-3 py-2 text-[11px]">
          <p className="text-foreground">
            <span className="mono font-medium">
              {stemOf(basename(path))}
            </span>{" "}
            was modified externally while you had unsaved changes. Saving now
            would clobber the external edit.
          </p>
        </div>

        {diffChanges !== null && (
          <div className="min-h-0 flex-1 overflow-auto border-b border-border">
            <div className="sticky top-0 bg-card/95 px-3 py-1 text-[9px] uppercase tracking-wider text-muted-foreground backdrop-blur">
              External (disk) vs. yours (editor)
            </div>
            <pre
              className="mono p-0 text-[11px] leading-relaxed"
              data-testid="conflict-diff-body"
            >
              {diffChanges.map((change, i) => (
                <DiffChunk key={i} change={change} />
              ))}
            </pre>
          </div>
        )}

        <footer className="flex items-center justify-end gap-1.5 px-3 py-2">
          <button
            type="button"
            onClick={() => void onShowDiff()}
            disabled={loadingDiff || externalText !== null}
            className="flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none"
            data-testid="conflict-dialog-diff"
          >
            <GitCompare className="h-3 w-3" />
            {loadingDiff ? "Loading…" : externalText !== null ? "Diff shown" : "Show diff"}
          </button>
          <button
            type="button"
            onClick={onReload}
            className="flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-warning hover:text-warning"
            data-testid="conflict-dialog-reload"
          >
            <RefreshCw className="h-3 w-3" />
            Reload from disk
          </button>
          <button
            type="button"
            onClick={onOverwrite}
            className="flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:brightness-110"
            data-testid="conflict-dialog-overwrite"
          >
            <Upload className="h-3 w-3" />
            Overwrite
          </button>
        </footer>
      </div>
    </div>
  );
}

