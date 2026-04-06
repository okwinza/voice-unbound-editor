import { cn } from "@/lib/cn";

interface AnchorItem {
  id: string;
  label: string;
  badge?: number;
}

const SECTIONS: AnchorItem[] = [
  { id: "section-general", label: "General" },
  { id: "section-filters", label: "Filters" },
  { id: "section-conditions", label: "Conditions" },
  { id: "section-audio", label: "Audio" },
];

export function AnchorNav() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className="sticky top-0 flex w-28 shrink-0 flex-col gap-0.5 py-4 pl-3 pr-2"
      data-testid="anchor-nav"
    >
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => scrollTo(s.id)}
          className={cn(
            "flex items-center justify-between rounded px-2 py-1 text-left text-xs font-medium",
            "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          )}
          title={`${s.label} (Ctrl+${i + 1})`}
          data-testid={`anchor-${s.id}`}
        >
          <span>{s.label}</span>
          {s.badge !== undefined && (
            <span className="text-[10px] text-muted-foreground/70">{s.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
