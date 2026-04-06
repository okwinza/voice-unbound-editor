import { useMemo, useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/cn";

interface IssueEntry {
  fileName: string;
  message: string;
  path: string;
}

export function StatusBar() {
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const documents = useWorkspaceStore((s) => s.documents);
  const fileList = useWorkspaceStore((s) => s.fileList);
  const toggleInspector = useUiStore((s) => s.toggleInspector);
  const openFile = useWorkspaceStore((s) => s.openFile);

  const summary = useMemo(() => {
    let dirty = 0;
    let warnings = 0;
    let errors = 0;
    let invalid = 0;
    const warningEntries: IssueEntry[] = [];
    const errorEntries: IssueEntry[] = [];
    for (const doc of documents.values()) {
      if (doc.dom === null) invalid++;
      if (doc.dirty) dirty++;
      const fileName = doc.path.split("/").pop() ?? doc.path;
      for (const issue of doc.issues) {
        const entry = { fileName, message: issue.message, path: doc.path };
        if (issue.severity === "error") {
          errors++;
          errorEntries.push(entry);
        } else if (issue.severity === "warning") {
          warnings++;
          warningEntries.push(entry);
        }
      }
    }
    return { dirty, warnings, errors, invalid, warningEntries, errorEntries };
  }, [documents]);

  const [panel, setPanel] = useState<"warnings" | "errors" | null>(null);

  return (
    <footer
      className="relative flex h-6 items-center gap-3 border-t border-border px-3 text-xs text-muted-foreground"
      data-testid="status-bar"
    >
      {workspacePath ? (
        <>
          <span
            className="mono truncate"
            title={workspacePath}
            data-testid="status-workspace-path"
          >
            {workspacePath}
          </span>
          <Separator />
          <span data-testid="status-file-count">
            {fileList.length} {fileList.length === 1 ? "file" : "files"}
          </span>
          <Separator />
          <StatusCounter
            shape="●"
            count={summary.dirty}
            label="unsaved"
            tone="warning"
            testId="status-unsaved"
          />
          <StatusCounter
            shape="◐"
            count={summary.warnings}
            label="warnings"
            tone="warning"
            testId="status-warnings"
            onClick={() => setPanel(panel === "warnings" ? null : "warnings")}
          />
          <StatusCounter
            shape="✕"
            count={summary.errors + summary.invalid}
            label="errors"
            tone="error"
            testId="status-errors"
            onClick={() => setPanel(panel === "errors" ? null : "errors")}
          />
        </>
      ) : (
        <span>No workspace open</span>
      )}

      <button
        type="button"
        className="ml-auto rounded px-2 py-0.5 hover:bg-accent hover:text-accent-foreground"
        onClick={toggleInspector}
        title="Toggle Inspector (Ctrl+J)"
        data-testid="status-inspector-toggle"
      >
        ⇧J Inspector
      </button>

      {panel && (
        <IssuesPanel
          kind={panel}
          entries={panel === "warnings" ? summary.warningEntries : summary.errorEntries}
          onClose={() => setPanel(null)}
          onNavigate={(path) => {
            openFile(path);
            setPanel(null);
          }}
        />
      )}
    </footer>
  );
}

function Separator() {
  return <span className="opacity-40">·</span>;
}

interface StatusCounterProps {
  shape: string;
  count: number;
  label: string;
  tone: "warning" | "error" | "ok";
  testId: string;
  onClick?: () => void;
}

function StatusCounter({ shape, count, label, tone, testId, onClick }: StatusCounterProps) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded px-1 transition-colors hover:bg-accent",
        tone === "error" && "text-destructive",
        tone === "warning" && "text-warning",
      )}
      data-testid={testId}
    >
      <span aria-hidden>{shape}</span>
      <span>{count}</span>
      <span className="opacity-70">{label}</span>
    </button>
  );
}

interface IssuesPanelProps {
  kind: "warnings" | "errors";
  entries: IssueEntry[];
  onClose: () => void;
  onNavigate: (path: string) => void;
}

function IssuesPanel({ kind, entries, onClose, onNavigate }: IssuesPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 z-40 max-h-[40vh] overflow-y-auto border-t border-border bg-card shadow-lg"
      data-testid={`issues-panel-${kind}`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className={cn(
          "text-[11px] font-medium uppercase tracking-wider",
          kind === "errors" ? "text-destructive" : "text-warning",
        )}>
          {entries.length} {kind === "errors" ? "error" : "warning"}{entries.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="px-3 py-4 text-center text-[12px] text-muted-foreground/60">
          No {kind}.
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {entries.map((e, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onNavigate(e.path)}
                className="flex w-full gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-accent/30"
              >
                <span className="mono shrink-0 text-foreground">{e.fileName}</span>
                <span className="truncate text-muted-foreground">{e.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
