import { HeroRow } from "./HeroRow";
import { AnchorNav } from "./AnchorNav";
import { GeneralSection } from "./Sections/GeneralSection";
import { FiltersSection } from "./Sections/FiltersSection";
import { ConditionsSection } from "./Sections/ConditionsSection";
import { AudioSection } from "./Sections/AudioSection";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function FormShell({ path }: { path: string }) {
  const doc = useWorkspaceStore((s) => s.documents.get(path));

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Document not found
      </div>
    );
  }

  if (doc.dom === null) {
    return (
      <div className="flex-1 overflow-auto p-4" data-testid="form-parse-error">
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4">
          <h2 className="mb-2 text-sm font-semibold text-destructive">
            Cannot parse JSON
          </h2>
          <pre className="mono whitespace-pre-wrap text-xs text-destructive/80">
            {doc.issues[0]?.message ?? "Unknown parse error"}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col" data-testid="form-shell">
      <HeroRow path={path} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AnchorNav />
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-8">
            <GeneralSection path={path} />
            <FiltersSection path={path} />
            <ConditionsSection path={path} />
            <AudioSection path={path} />
          </div>
        </div>
      </div>
    </div>
  );
}
