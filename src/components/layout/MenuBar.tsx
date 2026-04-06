import { FolderOpen, Save, RefreshCw, HelpCircle, BookOpen } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUiStore, type Theme } from "@/stores/ui-store";
import { getHost } from "@/lib/host";
import { DEMO_WORKSPACE } from "@/lib/fixtures/demo-workspace";
import { cn } from "@/lib/cn";

const BROWSER_MODE = import.meta.env.VITE_BROWSER_MODE === "true";

export function MenuBar() {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const saveAll = useWorkspaceStore((s) => s.saveAll);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleShortcutsOverlay = useUiStore((s) => s.toggleShortcutsOverlay);

  const handleOpenFolder = async () => {
    const host = getHost();
    const picked = await host.pickFolder();
    if (picked) await openWorkspace(picked);
  };

  const handleLoadDemo = () => {
    const host = getHost();
    if (host.kind !== "browser") return;
    // BrowserHost exposes seedWorkspace via window for Claude/tests; also
    // call it directly here to avoid touching global.
    (host as unknown as { seedWorkspace: (s: typeof DEMO_WORKSPACE) => void })
      .seedWorkspace(DEMO_WORKSPACE);
    void openWorkspace(DEMO_WORKSPACE.root);
  };

  return (
    <header className="hero-wash flex h-10 items-center gap-1 border-b border-border px-3 text-sm">
      <span className="font-display mr-4 text-[11px] text-foreground">
        <span className="text-primary">◆</span> Voice Unbound
      </span>

      <MenuButton
        icon={<FolderOpen className="h-4 w-4" />}
        label="Open Folder"
        shortcut="Ctrl+O"
        onClick={handleOpenFolder}
      />

      {BROWSER_MODE && (
        <MenuButton
          icon={<RefreshCw className="h-4 w-4" />}
          label="Load Demo"
          onClick={handleLoadDemo}
          data-testid="menu-load-demo"
        />
      )}

      <MenuButton
        icon={<Save className="h-4 w-4" />}
        label="Save All"
        shortcut="Ctrl+Shift+S"
        onClick={() => void saveAll()}
        disabled={!workspacePath}
      />

      <div className="ml-auto flex items-center gap-1">
        <ExternalLink
          href="https://github.com"
          label="GitHub"
          title="GitHub repo (WIP)"
          icon={<GithubMark />}
          testId="menu-link-github"
        />
        <ExternalLink
          href="https://github.com"
          label="Docs"
          title="Modding docs (WIP)"
          icon={<BookOpen className="h-4 w-4" />}
          testId="menu-link-docs"
        />
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={toggleShortcutsOverlay}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  "data-testid"?: string;
}

function MenuButton({ icon, label, shortcut, onClick, disabled, ...rest }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      data-testid={rest["data-testid"]}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:pointer-events-none"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function GithubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}

function ExternalLink({
  href,
  label,
  title,
  icon,
  testId,
}: {
  href: string;
  label: string;
  title: string;
  icon: React.ReactNode;
  testId: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      data-testid={testId}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
}) {
  const options: { value: Theme; label: string }[] = [
    { value: "skyrim", label: "Skyrim" },
    { value: "neutral", label: "Neutral" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center rounded border border-border bg-background/40 p-0.5"
      data-testid="menu-toggle-theme"
    >
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            title={`${opt.label} theme`}
            data-testid={`menu-theme-${opt.value}`}
            className={cn(
              "rounded-sm px-2 py-0.5 text-[11px] font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
