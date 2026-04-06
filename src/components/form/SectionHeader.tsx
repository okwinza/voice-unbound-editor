import { cn } from "@/lib/cn";

/**
 * Section header: roman numeral + middle-dot separator + display-caps title,
 * underlined by the iron-rule double-line.
 *
 *   I · GENERAL
 *   II · FILTERS
 *   III · CONDITIONS
 */
interface SectionHeaderProps {
  numeral: string;       // e.g. "I", "II", "III"
  title: string;
  count?: number;
  className?: string;
}

export function SectionHeader({ numeral, title, count, className }: SectionHeaderProps) {
  return (
    <header className={cn("iron-rule mb-5 flex items-baseline gap-2 pb-2", className)}>
      <span
        className="font-display text-[15px] text-primary"
        aria-hidden
      >
        {numeral}
      </span>
      <span
        className="font-display text-[15px] text-muted-foreground/40"
        aria-hidden
      >
        ·
      </span>
      <h2 className="font-display text-[15px] text-foreground">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="mono ml-auto text-[11px] text-muted-foreground">
          {count}
        </span>
      )}
    </header>
  );
}
