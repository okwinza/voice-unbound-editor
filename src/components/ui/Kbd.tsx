import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface KbdProps {
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function Kbd({ children, size = "md", className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "mono rounded border border-border bg-muted/40",
        size === "sm" ? "px-1 text-[9px]" : "px-1.5 py-[1px] text-[10px]",
        "text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
