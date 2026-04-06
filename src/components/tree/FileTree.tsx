import { useMemo, useState, useRef, useCallback } from "react";
import { Tree, type TreeApi } from "react-arborist";
import { Search } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { buildTree, filterTree, type TreeNodeData } from "./tree-data";
import { FileNode } from "./FileNode";
import { NewFileMenu } from "./NewFileMenu";

export function FileTree() {
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const fileList = useWorkspaceStore((s) => s.fileList);
  const treeSelection = useWorkspaceStore((s) => s.treeSelection);
  const [query, setQuery] = useState("");
  const treeRef = useRef<TreeApi<TreeNodeData> | null>(null);
  const [dims, setDims] = useState({ w: 260, h: 400 });

  // Callback ref: attaches/detaches the ResizeObserver as the container
  // element enters/leaves the DOM. This survives the empty → populated
  // workspace transition (useEffect with [] deps only fires once and
  // would never see the container's first real mount).
  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.max(100, width - 8), h: Math.max(100, height) });
    });
    ro.observe(el);
    observerRef.current = ro;
    // Fire an immediate measurement so the initial render isn't stuck at
    // the default 400px (ResizeObserver callbacks fire async).
    const rect = el.getBoundingClientRect();
    setDims({ w: Math.max(100, rect.width - 8), h: Math.max(100, rect.height) });
  }, []);

  const nodes = useMemo(() => {
    if (!workspacePath) return [] as TreeNodeData[];
    const full = buildTree(workspacePath, fileList);
    return filterTree(full, query);
  }, [workspacePath, fileList, query]);

  return (
    <div className="flex h-full flex-col">
      {/* Always render the search row so the tree-container's initial size
          stays stable — avoids a post-mount layout shift that the
          ResizeObserver wouldn't always catch. */}
      <div className="flex items-center gap-1.5 border-b border-border p-1.5">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!workspacePath}
            className="h-7 w-full rounded-sm border border-border bg-input px-2 pl-7 text-xs outline-none transition-colors focus:border-ring disabled:opacity-40"
            data-testid="tree-search"
          />
        </div>
        <NewFileMenu />
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden p-1" data-testid="tree-container">
        {!workspacePath ? (
          <EmptyState
            message="No workspace open"
            hint="Open a folder with .json voice-line configs"
          />
        ) : nodes.length === 0 ? (
          <EmptyState
            message={query ? "No matches" : "Empty workspace"}
            hint={query ? "Try a different filter" : "Add .json files to get started"}
          />
        ) : (
          <Tree
            ref={treeRef}
            data={nodes}
            width={dims.w}
            height={dims.h}
            rowHeight={parseInt(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--density-row-h",
              ),
            ) || 32}
            indent={10}
            openByDefault
            selection={treeSelection ?? undefined}
            className="!overflow-x-hidden"
          >
            {FileNode}
          </Tree>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70">{hint}</p>
    </div>
  );
}
