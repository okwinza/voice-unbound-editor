import { MenuBar } from "@/components/layout/MenuBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { ResizablePane } from "@/components/layout/ResizablePane";
import { FileTree } from "@/components/tree/FileTree";
import { WorkspaceSearchPanel } from "@/components/tree/WorkspaceSearchPanel";
import { FileTabs } from "@/components/tabs/FileTabs";
import { FormShell } from "@/components/form/FormShell";
import { InspectorSheet } from "@/components/inspector/InspectorSheet";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ShortcutsOverlay } from "@/components/layout/ShortcutsOverlay";
import { WorkspaceUndoDrawer } from "@/components/layout/WorkspaceUndoDrawer";
import { FindReplaceDialog } from "@/components/layout/FindReplaceDialog";
import { BulkEditDrawer } from "@/components/layout/BulkEditDrawer";
import { SchemaReferenceSheet } from "@/components/layout/SchemaReferenceSheet";
import { FileConflictDialog } from "@/components/layout/FileConflictDialog";
import { useUiStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAudioShortcuts } from "@/stores/use-audio-shortcuts";
import { useAutosave } from "@/stores/use-autosave";
import { useGlobalShortcuts } from "@/stores/use-global-shortcuts";
import { useWorkspaceWatcher } from "@/stores/use-workspace-watcher";

export default function App() {
  useAudioShortcuts();
  useAutosave();
  useGlobalShortcuts();
  useWorkspaceWatcher();
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <MenuBar />
      <div className="min-h-0 flex-1">
        <ResizablePane
          left={<LeftSidebar />}
          right={<EditorArea />}
        />
      </div>
      <StatusBar />
      <InspectorSheet />
      <CommandPalette />
      <ShortcutsOverlay />
      <WorkspaceUndoDrawer />
      <FindReplaceDialog />
      <BulkEditDrawer />
      <SchemaReferenceSheet />
      <FileConflictDialog />
    </div>
  );
}

function LeftSidebar() {
  const searchOpen = useUiStore((s) => s.workspaceSearchOpen);
  return searchOpen ? <WorkspaceSearchPanel /> : <FileTree />;
}

function EditorArea() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const document = useWorkspaceStore((s) =>
    activeTab ? s.documents.get(activeTab) : null,
  );

  return (
    <div className="flex h-full flex-col">
      <FileTabs />
      {activeTab && document ? <FormShell path={activeTab} /> : <NoFileOpen />}
    </div>
  );
}

function NoFileOpen() {
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  return (
    <div className="hero-wash flex flex-1 items-center justify-center">
      <div className="max-w-md text-center rise">
        <div className="mb-6 text-5xl text-primary/80 opacity-80" aria-hidden>
          ◆
        </div>
        <h1 className="font-display mb-3 text-[22px] text-foreground">
          Voice Unbound
        </h1>
        <div
          className="mx-auto mb-5 h-px w-16 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden
        />
        <p className="text-xs text-muted-foreground">
          {workspacePath
            ? "Select a voice line from the tree to begin."
            : "Open a folder with .json voice-line configs to begin."}
        </p>
      </div>
    </div>
  );
}
