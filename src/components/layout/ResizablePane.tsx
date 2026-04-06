import { useRef, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Minimal horizontal resizable split — left pane at a fixed pixel width,
 * right pane flex-grows. The divider is keyboard-accessible (Left/Right to
 * nudge, Home/End to clamp).
 */
export function ResizablePane({
  left,
  right,
  initialLeft = 260,
  min = 180,
  max = 480,
}: {
  left: ReactNode;
  right: ReactNode;
  initialLeft?: number;
  min?: number;
  max?: number;
}) {
  const [width, setWidth] = useState(initialLeft);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = width;
    document.body.style.cursor = "col-resize";

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.max(min, Math.min(max, startWidth + ev.clientX - startX));
      setWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, min, max]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setWidth((w) => Math.max(min, w - 16));
    else if (e.key === "ArrowRight") setWidth((w) => Math.min(max, w + 16));
    else if (e.key === "Home") setWidth(min);
    else if (e.key === "End") setWidth(max);
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <div
        className="h-full shrink-0 overflow-hidden"
        style={{ width }}
        data-testid="pane-left"
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKey}
        className={cn(
          "group h-full w-[3px] cursor-col-resize shrink-0 bg-border transition-colors hover:bg-primary/50 focus-visible:bg-primary",
        )}
        data-testid="pane-divider"
      />
      <div
        className="h-full min-w-0 flex-1 overflow-hidden"
        data-testid="pane-right"
      >
        {right}
      </div>
    </div>
  );
}
