import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Minimal slide-in sheet: backdrop + right-edge panel. Closes on Escape
 * or backdrop click. Width controllable per-instance.
 */
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
  "data-testid"?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  width = 420,
  ...rest
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/40 backdrop-blur-[1px] transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 flex flex-col border-l border-border bg-card shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        data-testid={rest["data-testid"]}
      >
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="font-display text-[12px] text-foreground">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Close"
            data-testid="sheet-close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </aside>
    </>
  );
}
