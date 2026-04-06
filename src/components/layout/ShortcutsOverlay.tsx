import { useEffect } from "react";
import { X } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { Kbd } from "@/components/ui/Kbd";

interface ShortcutGroup {
  title: string;
  items: [string, string][];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "File",
    items: [
      ["Ctrl+O", "Open folder"],
      ["Ctrl+S", "Save active tab"],
      ["Ctrl+Shift+S", "Save all"],
      ["Ctrl+D", "Duplicate current"],
      ["F2", "Rename selected"],
      ["F5", "Reload workspace"],
    ],
  },
  {
    title: "Navigation",
    items: [
      ["Ctrl+K", "Command palette"],
      ["Ctrl+Shift+F", "Search workspace"],
      ["Ctrl+Shift+H", "Find & replace"],
      ["Ctrl+Shift+Z", "Undo across files"],
      ["Ctrl+J", "Toggle Inspector"],
      ["?", "This shortcut map"],
      ["Esc", "Close sheets & dialogs"],
    ],
  },
  {
    title: "Audio",
    items: [
      ["Space", "Play/stop focused wav"],
      ["Shift+Space", "Play next in folder"],
    ],
  },
  {
    title: "Conditions",
    items: [
      ["Drag handle", "Reorder within container"],
      ["Hover row → Wrap", "Wrap in AND group"],
      ["Hover row → Extract", "Lift to parent"],
    ],
  },
];

export function ShortcutsOverlay() {
  const open = useUiStore((s) => s.showShortcutsOverlay);
  const toggle = useUiStore((s) => s.toggleShortcutsOverlay);

  // Escape closes — the global `?` handler toggles from both states.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={toggle}
      data-testid="shortcuts-overlay-backdrop"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-md border border-border bg-popover shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        data-testid="shortcuts-overlay"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[11px] text-primary">?</span>
            <span className="font-display text-[13px] text-foreground">
              Keyboard shortcuts
            </span>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-5">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 font-display text-[10px] text-muted-foreground">
                {group.title}
              </h3>
              <dl className="space-y-1.5">
                {group.items.map(([keys, label]) => (
                  <div
                    key={keys}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <dt className="text-[12px] text-foreground">{label}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {keys.split("+").map((part, i) => (
                        <Kbd key={i}>{part}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          Press <Kbd size="sm">?</Kbd> or <Kbd size="sm">Esc</Kbd> to close.
        </footer>
      </div>
    </div>
  );
}
