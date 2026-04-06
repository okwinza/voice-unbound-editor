import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-7 w-full rounded-sm border border-border bg-input px-2 text-xs",
          "outline-none transition-colors focus:border-ring",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className,
        )}
        {...rest}
      />
    );
  },
);
