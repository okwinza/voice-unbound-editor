import { useSyncExternalStore, useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, Play, Pause, Trash2 } from "lucide-react";
import type { NodeRendererProps } from "react-arborist";
import {
  useWorkspaceStore,
  type DocumentStatus,
} from "@/stores/workspace-store";
import { AudioPlayer } from "@/lib/audio";
import { EVENT_META } from "@/lib/event-meta";
import { isKnownEvent } from "@/lib/enums";
import { extractEventName } from "@/lib/dom-accessors";
import { wavPathFor, stemOf, folderOf } from "@/lib/paths";
import { validateFilename } from "@/lib/filename";
import { cn } from "@/lib/cn";
import type { TreeNodeData } from "./tree-data";

/**
 * Per-row "is this wav currently playing?" selector. Avoids subscribing
 * all N tree rows to every AudioPlayer state transition — each row only
 * re-renders when its own boolean flips.
 */
function useIsPlaying(wavPath: string): boolean {
  return useSyncExternalStore(
    (fn) => AudioPlayer.subscribe(fn),
    () => {
      const s = AudioPlayer.getState();
      return s.playingPath === wavPath && s.isPlaying;
    },
    () => false,
  );
}

export function FileNode({ node, style, dragHandle }: NodeRendererProps<TreeNodeData>) {
  const data = node.data;
  const isFolder = data.kind === "folder";
  const depth = node.level;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "group flex h-[var(--density-row-h)] cursor-pointer items-center gap-1.5 rounded pl-1 pr-2 text-xs select-none",
        node.isSelected && "bg-accent text-accent-foreground",
        !node.isSelected && "hover:bg-accent/40",
      )}
      data-testid={`tree-node-${data.path}`}
      onClick={() => {
        if (isFolder) node.toggle();
        else {
          useWorkspaceStore.getState().openFile(data.path);
        }
      }}
    >
      <span style={{ width: depth * 10 }} aria-hidden />
      {isFolder ? (
        <FolderRow node={node} data={data} />
      ) : (
        <FileRow path={data.path} name={data.name} />
      )}
    </div>
  );
}

function FolderRow({
  node,
  data,
}: {
  node: NodeRendererProps<TreeNodeData>["node"];
  data: TreeNodeData;
}) {
  const childCount = data.children?.filter((c) => c.kind === "file").length ?? 0;
  return (
    <>
      <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
        {node.isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </span>
      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{data.name}</span>
      {childCount > 0 && (
        <span className="ml-auto text-[10px] text-muted-foreground">{childCount}</span>
      )}
    </>
  );
}

function FileRow({ path, name }: { path: string; name: string }) {
  const doc = useWorkspaceStore((s) => s.documents.get(path));
  const status = useWorkspaceStore((s) => s.getStatus(path));
  const renaming = useWorkspaceStore((s) => s.renamingPath === path);
  const wavPath = wavPathFor(path);
  const isPlaying = useIsPlaying(wavPath);

  const eventName = extractEventName(doc?.dom);
  const eventMeta =
    eventName && isKnownEvent(eventName) ? EVENT_META[eventName] : null;

  if (renaming) {
    return (
      <>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center" />
        <span className="flex h-4 w-4 shrink-0 items-center justify-center" />
        <StatusShape status={status} />
        <RenameInput path={path} name={name} />
      </>
    );
  }

  return (
    <>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void AudioPlayer.toggle(wavPath);
        }}
        title={isPlaying ? "Stop (Space)" : "Play wav (Space)"}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors",
          isPlaying
            ? "bg-primary/30 text-primary"
            : "text-muted-foreground/60 hover:bg-primary/20 hover:text-primary",
        )}
        aria-label={isPlaying ? "Stop" : "Play wav"}
        data-testid={`tree-play-${path}`}
      >
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <StatusShape status={status} />
      <span
        className="mono truncate"
        onDoubleClick={(e) => {
          e.stopPropagation();
          useWorkspaceStore.getState().startRename(path);
        }}
        title="Double-click or F2 to rename"
      >
        {stemOf(name)}
      </span>
      {eventMeta ? (
        <span
          className={cn(
            "ml-auto rounded-sm px-1.5 py-[1px] text-[9px] font-medium text-white/90 group-hover:hidden",
            eventMeta.bgClass,
          )}
          title={eventName ?? ""}
        >
          {eventMeta.label}
        </span>
      ) : (
        <span className="ml-auto" aria-hidden />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete ${stemOf(name)}?`)) {
            void useWorkspaceStore.getState().deleteFile(path);
          }
        }}
        title="Delete file"
        aria-label="Delete file"
        className="hidden h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/20 hover:text-destructive group-hover:flex"
        data-testid={`tree-delete-${path}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </>
  );
}

const STATUS_SHAPES: Record<DocumentStatus, { shape: string; cls: string; label: string }> = {
  clean: { shape: "●", cls: "text-success", label: "clean" },
  unsaved: { shape: "○", cls: "text-warning", label: "unsaved" },
  warnings: { shape: "◐", cls: "text-warning", label: "warnings" },
  errors: { shape: "✕", cls: "text-destructive", label: "errors" },
  invalid: { shape: "✕", cls: "text-destructive", label: "invalid JSON" },
};

function RenameInput({ path, name }: { path: string; name: string }) {
  const stem = stemOf(name);
  const [value, setValue] = useState(stem);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus + select stem on open (no extension).
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === stem) {
      useWorkspaceStore.getState().cancelRename();
      return;
    }
    const nextName = trimmed.endsWith(".json") ? trimmed : `${trimmed}.json`;
    const check = validateFilename(nextName);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    const nextPath = `${folderOf(path)}/${nextName}`;
    const { fileList, renameFile, cancelRename } = useWorkspaceStore.getState();
    if (fileList.includes(nextPath) && nextPath !== path) {
      setError("A file with that name already exists.");
      return;
    }
    void renameFile(path, nextPath).catch(() => cancelRename());
  };

  return (
    <div className="min-w-0 flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") useWorkspaceStore.getState().cancelRename();
        }}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "mono h-5 w-full rounded-sm border bg-input px-1 text-xs outline-none",
          error ? "border-destructive" : "border-ring",
        )}
        data-testid={`tree-rename-input-${path}`}
      />
      {error && (
        <p className="mt-0.5 text-[9px] text-destructive" data-testid="tree-rename-error">
          {error}
        </p>
      )}
    </div>
  );
}

function StatusShape({ status }: { status: DocumentStatus }) {
  const m = STATUS_SHAPES[status];
  return (
    <span
      className={cn("shrink-0 text-[10px] leading-none", m.cls)}
      aria-label={m.label}
      title={m.label}
    >
      {m.shape}
    </span>
  );
}
