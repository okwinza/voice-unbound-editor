import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={2}
      className={cn(
        "w-full rounded-sm border border-border bg-input px-2 py-1.5 text-xs leading-relaxed",
        "outline-none transition-colors focus:border-ring resize-y min-h-[2.5rem]",
        className,
      )}
      {...rest}
    />
  );
});
