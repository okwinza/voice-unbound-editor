import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Tag-style multi-value input for numeric ranges. Value in / out is a
 * `number[]`; users type digits, Enter / comma / space commits.
 * Invalid tokens (non-numeric, out of range, non-integer when
 * `integer: true`) are flagged visually via border tone.
 */
interface NumberChipInputProps {
  value: readonly number[] | undefined;
  onChange: (value: number[] | undefined) => void;
  min?: number;
  max?: number;
  /** Restrict to integers (default true). Set false to allow floats like 2.5. */
  integer?: boolean;
  placeholder?: string;
  "data-testid"?: string;
}

export function NumberChipInput({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  integer = true,
  placeholder,
  ...rest
}: NumberChipInputProps) {
  const [pending, setPending] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const values = value ?? [];

  const emit = (next: number[]) => {
    onChange(next.length > 0 ? next : undefined);
  };

  const isValid = (n: number): boolean =>
    Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));

  const addChip = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const n = Number(trimmed);
    if (!isValid(n)) {
      // Keep the token so the user can fix it.
      return;
    }
    if (values.includes(n)) {
      setPending("");
      return;
    }
    emit([...values, n]);
    setPending("");
  };

  const removeChip = (index: number) => {
    emit(values.filter((_, i) => i !== index));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addChip(pending);
    } else if (e.key === "Backspace" && pending === "" && values.length > 0) {
      e.preventDefault();
      removeChip(values.length - 1);
    }
  };

  const pendingParsed = pending.trim() === "" ? null : Number(pending);
  const pendingInvalid = pendingParsed !== null && !isValid(pendingParsed);

  return (
    <div
      className={cn(
        "flex min-h-7 flex-wrap items-center gap-1 rounded-sm border bg-input px-1.5 py-1 text-xs transition-colors",
        pendingInvalid ? "border-destructive/60" : "border-border focus-within:border-ring",
      )}
      onClick={() => inputRef.current?.focus()}
      data-testid={rest["data-testid"]}
    >
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="mono group flex items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-[1px] text-[10px] text-primary"
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
      ))}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={pending}
        onChange={(e) => setPending(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => pending && addChip(pending)}
        placeholder={values.length === 0 ? placeholder : ""}
        className="mono flex-1 min-w-[60px] bg-transparent px-1 py-[1px] outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  );
}
