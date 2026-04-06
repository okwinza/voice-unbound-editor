import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[12px] font-medium text-muted-foreground select-none tracking-wide",
        className,
      )}
      {...rest}
    />
  );
}
