import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Replace, X, AlertTriangle } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import {
  useWorkspaceStore,
  type FindReplaceResult,
} from "@/stores/workspace-store";
import { basename, stemOf } from "@/lib/paths";
import { cn } from "@/lib/cn";

interface FilePreview {
  path: string;
  matches: number;
}

/**
 * Modal find/replace across all files in the workspace. Replacements
 * happen at the raw-JSON text level, then each result is re-parsed via
 * Zod's JSON safely. Files whose replacement would produce invalid
 * JSON are listed as skipped and NOT written — the user can narrow
 * their pattern and try again.
 */
export function FindReplaceDialog() {
  const open = useUiStore((s) => s.findReplaceOpen);
  const close = useUiStore((s) => s.closeFindReplace);
  const documents = useWorkspaceStore((s) => s.documents);
  const applyFindReplace = useWorkspaceStore((s) => s.applyFindReplace);

  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FindReplaceResult | null>(null);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    const id = requestAnimationFrame(() => findRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const previews = useMemo<FilePreview[]>(() => {
    if (!find) return [];
    const needle = caseSensitive ? find : find.toLowerCase();
    const out: FilePreview[] = [];
    for (const [path, doc] of documents) {
      const hay = caseSensitive ? doc.rawJson : doc.rawJson.toLowerCase();
      let count = 0;
      let idx = 0;
      while ((idx = hay.indexOf(needle, idx)) !== -1) {
        count++;
        idx += needle.length;
      }
      if (count > 0) out.push({ path, matches: count });
    }
    return out;
  }, [documents, find, caseSensitive]);

  const totalMatches = previews.reduce((n, p) => n + p.matches, 0);

  const runReplace = async () => {
    if (!find || busy) return;
    setBusy(true);
    try {
      const r = await applyFindReplace(find, replace, caseSensitive);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void runReplace();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/60 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={close}
      data-testid="find-replace-backdrop"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-md border border-border bg-popover shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Find and replace"
        onKeyDown={onKeyDown}
        data-testid="find-replace-dialog"
      >
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Replace className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-display text-[12px] text-foreground">
              Find &amp; replace in workspace
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
            data-testid="find-replace-close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-2 px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={findRef}
              type="text"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Find…"
              className="mono h-8 w-full rounded-sm border border-border bg-input px-2 pl-7 text-xs outline-none focus:border-ring"
              data-testid="find-replace-find"
            />
          </div>
          <div className="relative">
            <Replace className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace with…"
              className="mono h-8 w-full rounded-sm border border-border bg-input px-2 pl-7 text-xs outline-none focus:border-ring"
              data-testid="find-replace-replace"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="h-3 w-3 accent-primary"
                data-testid="find-replace-case"
              />
              Case sensitive
            </label>
            {find && (
              <span className="mono" data-testid="find-replace-count">
                {totalMatches} {totalMatches === 1 ? "match" : "matches"} in{" "}
                {previews.length} {previews.length === 1 ? "file" : "files"}
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[40vh] overflow-auto border-t border-border">
          {find && previews.length === 0 && !result && (
            <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
              No matches.
            </p>
          )}
          {find && previews.length > 0 && !result && (
            <ul className="divide-y divide-border/40">
              {previews.map((p) => (
                <PreviewRow key={p.path} path={p.path} matches={p.matches} />
              ))}
            </ul>
          )}
          {result && (
            <ResultSummary result={result} />
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <span className="text-[10px] text-muted-foreground">
            Each changed file is saved + added to the undo drawer.
          </span>
          <div className="flex items-center gap-1.5">
            {result && (
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
              >
                New search
              </button>
            )}
            <button
              type="button"
              onClick={() => void runReplace()}
              disabled={!find || previews.length === 0 || busy || !!result}
              className={cn(
                "flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] font-medium",
                "bg-primary text-primary-foreground",
                "hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none",
              )}
              data-testid="find-replace-apply"
            >
              <Replace className="h-3 w-3" />
              {busy ? "Replacing…" : "Replace all"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PreviewRow({ path, matches }: { path: string; matches: number }) {
  return (
    <li
      className="flex items-center justify-between px-3 py-1.5"
      data-testid={`find-replace-file-${path}`}
    >
      <span className="mono truncate text-[11px] text-foreground">
        {stemOf(basename(path))}
      </span>
      <span className="mono text-[10px] text-muted-foreground">
        {matches} {matches === 1 ? "match" : "matches"}
      </span>
    </li>
  );
}

function ResultSummary({ result }: { result: FindReplaceResult }) {
  return (
    <div className="space-y-2 p-3">
      <p className="text-[11px] text-foreground">
        Replaced {result.totalReplacements}{" "}
        {result.totalReplacements === 1 ? "occurrence" : "occurrences"} across{" "}
        {result.changedPaths.length}{" "}
        {result.changedPaths.length === 1 ? "file" : "files"}.
      </p>
      {result.skippedPaths.length > 0 && (
        <div
          className="rounded border border-warning/40 bg-warning/5 p-2 text-[10px]"
          data-testid="find-replace-skipped"
        >
          <div className="mb-1 flex items-center gap-1.5 text-warning">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">
              Skipped {result.skippedPaths.length} — replacement would break
              JSON
            </span>
          </div>
          <ul className="mono space-y-0.5 text-muted-foreground">
            {result.skippedPaths.map((p) => (
              <li key={p} className="truncate">
                {stemOf(basename(p))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
