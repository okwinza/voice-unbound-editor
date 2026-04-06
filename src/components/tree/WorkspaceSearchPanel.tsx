import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { EVENT_META } from "@/lib/event-meta";
import { isKnownEvent } from "@/lib/enums";
import { extractEventName } from "@/lib/dom-accessors";
import { basename, stemOf } from "@/lib/paths";
import { cn } from "@/lib/cn";

const MAX_MATCHES_PER_FILE = 5;
const MAX_FILES = 50;
const DEBOUNCE_MS = 120;

interface LineMatch {
  lineNumber: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

interface FileResult {
  path: string;
  filenameMatch: boolean;
  lineMatches: LineMatch[];
  totalMatches: number;
}

/**
 * Replaces the file tree in the left sidebar when `workspaceSearchOpen`
 * is true. Substring search (case-insensitive) against filenames + the
 * raw JSON text of every open document. Results grouped per file with
 * up to MAX_MATCHES_PER_FILE line snippets each.
 */
export function WorkspaceSearchPanel() {
  const close = useUiStore((s) => s.closeWorkspaceSearch);
  const documents = useWorkspaceStore((s) => s.documents);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(rawQuery.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [rawQuery]);

  const results = useMemo<FileResult[]>(() => {
    if (!query) return [];
    const needle = query.toLowerCase();
    const out: FileResult[] = [];
    for (const [path, doc] of documents) {
      const name = basename(path).toLowerCase();
      const filenameMatch = name.includes(needle);
      const lineMatches = scanLines(doc.rawJson, needle);
      if (!filenameMatch && lineMatches.length === 0) continue;
      out.push({
        path,
        filenameMatch,
        lineMatches: lineMatches.slice(0, MAX_MATCHES_PER_FILE),
        totalMatches: lineMatches.length,
      });
      if (out.length >= MAX_FILES) break;
    }
    return out;
  }, [documents, query]);

  const totalMatches = useMemo(
    () => results.reduce((n, r) => n + r.totalMatches + (r.filenameMatch ? 1 : 0), 0),
    [results],
  );

  const handleOpen = (path: string) => {
    openFile(path);
    close();
  };

  return (
    <div className="flex h-full flex-col" data-testid="workspace-search-panel">
      <div className="flex items-center gap-1.5 border-b border-border p-1.5">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search workspace…"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="h-7 w-full rounded-sm border border-ring bg-input px-2 pl-7 text-xs outline-none"
            data-testid="workspace-search-input"
          />
        </div>
        <button
          type="button"
          onClick={close}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Close search (Esc)"
          aria-label="Close search"
          data-testid="workspace-search-close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto" data-testid="workspace-search-results">
        {!query ? (
          <EmptyNote
            title="Search workspace"
            hint="Matches filenames and JSON content across every file."
          />
        ) : results.length === 0 ? (
          <EmptyNote title="No matches" hint={`"${query}" not found`} />
        ) : (
          <>
            <div className="px-2.5 py-1 text-[10px] text-muted-foreground">
              {totalMatches} {totalMatches === 1 ? "match" : "matches"} in {results.length}{" "}
              {results.length === 1 ? "file" : "files"}
              {results.length >= MAX_FILES ? " (capped)" : ""}
            </div>
            <ul className="pb-2">
              {results.map((r) => (
                <FileResultGroup
                  key={r.path}
                  result={r}
                  query={query}
                  onOpen={() => handleOpen(r.path)}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function FileResultGroup({
  result,
  query,
  onOpen,
}: {
  result: FileResult;
  query: string;
  onOpen: () => void;
}) {
  const doc = useWorkspaceStore((s) => s.documents.get(result.path));
  const eventName = extractEventName(doc?.dom);
  const eventMeta =
    eventName && isKnownEvent(eventName) ? EVENT_META[eventName] : null;
  const stem = stemOf(basename(result.path));
  const extraMatches = result.totalMatches - result.lineMatches.length;

  return (
    <li className="px-1">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-accent/40"
        data-testid={`search-file-${result.path}`}
      >
        <span
          className={cn(
            "mono truncate text-xs font-medium",
            result.filenameMatch && "text-primary",
          )}
        >
          {stem}
        </span>
        {eventMeta && (
          <span
            className={cn(
              "rounded-sm px-1 py-[1px] text-[9px] font-medium text-white/90",
              eventMeta.bgClass,
            )}
          >
            {eventMeta.label}
          </span>
        )}
        <span className="ml-auto text-[9px] text-muted-foreground">
          {result.totalMatches}
        </span>
      </button>
      <ul className="mb-1 ml-2 border-l border-border/60">
        {result.lineMatches.map((m) => (
          <li key={m.lineNumber}>
            <button
              type="button"
              onClick={onOpen}
              className="flex w-full items-baseline gap-2 px-2 py-0.5 text-left hover:bg-accent/30"
              data-testid={`search-match-${result.path}-${m.lineNumber}`}
            >
              <span className="mono w-6 shrink-0 text-right text-[9px] text-muted-foreground/70">
                {m.lineNumber}
              </span>
              <span className="mono truncate text-[10px] text-muted-foreground">
                <HighlightedSnippet
                  text={m.text}
                  start={m.matchStart}
                  end={m.matchEnd}
                  query={query}
                />
              </span>
            </button>
          </li>
        ))}
        {extraMatches > 0 && (
          <li className="px-2 py-0.5 text-[9px] text-muted-foreground/60">
            +{extraMatches} more
          </li>
        )}
      </ul>
    </li>
  );
}

function HighlightedSnippet({
  text,
  start,
  end,
  query,
}: {
  text: string;
  start: number;
  end: number;
  query: string;
}) {
  // Trim long lines around the match so the snippet fits the panel width.
  const windowSize = 60;
  const before = Math.max(0, start - 20);
  const after = Math.min(text.length, end + windowSize);
  const prefix = before > 0 ? "…" : "";
  const suffix = after < text.length ? "…" : "";
  const snippet = text.slice(before, after);
  const localStart = start - before;
  const localEnd = end - before;
  return (
    <>
      {prefix}
      {snippet.slice(0, localStart)}
      <mark
        className="rounded-sm bg-primary/30 px-0.5 text-foreground"
        data-query={query}
      >
        {snippet.slice(localStart, localEnd)}
      </mark>
      {snippet.slice(localEnd)}
      {suffix}
    </>
  );
}

function EmptyNote({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70">{hint}</p>
    </div>
  );
}

/** Case-insensitive substring scan returning all matching line ranges. */
function scanLines(text: string, needle: string): LineMatch[] {
  if (!needle) return [];
  const out: LineMatch[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.toLowerCase().indexOf(needle);
    if (idx < 0) continue;
    out.push({
      lineNumber: i + 1,
      text: line,
      matchStart: idx,
      matchEnd: idx + needle.length,
    });
  }
  return out;
}
