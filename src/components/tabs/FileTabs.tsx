import { X } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { cn } from "@/lib/cn";

function basename(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const name = i < 0 ? path : path.slice(i + 1);
  return name.replace(/\.json$/, "");
}

export function FileTabs() {
  const openTabs = useWorkspaceStore((s) => s.openTabs);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const switchTab = useWorkspaceStore((s) => s.switchTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const documents = useWorkspaceStore((s) => s.documents);

  if (openTabs.length === 0) return null;

  return (
    <div
      className="flex h-8 items-stretch border-b border-border overflow-x-auto"
      data-testid="file-tabs"
    >
      {openTabs.map((path) => {
        const isActive = path === activeTab;
        const doc = documents.get(path);
        const dirty = doc?.dirty ?? false;
        return (
          <div
            key={path}
            role="tab"
            aria-selected={isActive}
            onClick={() => switchTab(path)}
            className={cn(
              "group flex cursor-pointer items-center gap-1.5 border-r border-border px-3 text-xs transition-colors",
              isActive
                ? "bg-background text-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
            )}
            data-testid={`tab-${path}`}
          >
            {dirty && <span className="text-warning" aria-label="unsaved">●</span>}
            <span className="mono">{basename(path)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              className="ml-1 rounded p-0.5 opacity-40 hover:bg-destructive/20 hover:text-destructive hover:opacity-100"
              aria-label="Close tab"
              data-testid={`tab-close-${path}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
