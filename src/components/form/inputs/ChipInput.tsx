import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Tag-style multi-value input. Auto-detects scalar vs array — callers hand
 * in a string | string[] and get the same shape back in onChange.
 *
 * Enter or comma commits the pending value as a chip. Backspace on empty
 * deletes the last chip.
 */
interface ChipInputProps {
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
  placeholder?: string;
  /** Optional list of values to accept; anything else flagged visually. */
  allowed?: readonly string[];
  "data-testid"?: string;
}

export function ChipInput({
  value,
  onChange,
  placeholder,
  allowed,
  ...rest
}: ChipInputProps) {
  const [pending, setPending] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const allowedSet = allowed ? new Set(allowed) : null;

  const emit = (next: string[]) => {
    if (next.length === 0) onChange(undefined);
    else if (next.length === 1) onChange(next[0]);
    else onChange(next);
  };

  const addChip = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setPending("");
      return;
    }
    emit([...values, trimmed]);
    setPending("");
  };

  const removeChip = (index: number) => {
    emit(values.filter((_, i) => i !== index));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(pending);
    } else if (e.key === "Backspace" && pending === "" && values.length > 0) {
      e.preventDefault();
      removeChip(values.length - 1);
    }
  };

  return (
    <div
      className="flex min-h-7 flex-wrap items-center gap-1 rounded-sm border border-border bg-input px-1.5 py-1 text-xs transition-colors focus-within:border-ring"
      onClick={() => inputRef.current?.focus()}
      data-testid={rest["data-testid"]}
    >
      {values.map((v, i) => {
        const invalid = allowedSet !== null && !allowedSet.has(v);
        return (
          <span
            key={`${v}-${i}`}
            className={cn(
              "mono group flex items-center gap-1 rounded-sm border px-1.5 py-[1px] text-[10px]",
              invalid
                ? "border-warning/60 bg-warning/10 text-warning"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeChip(i);
              }}
              className="rounded opacity-60 hover:opacity-100"
              aria-label={`Remove ${v}`}
              tabIndex={-1}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        type="text"
        value={pending}
        onChange={(e) => setPending(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => pending && addChip(pending)}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] bg-transparent px-1 py-[1px] outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  );
}
