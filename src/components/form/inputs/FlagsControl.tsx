import { Switch } from "@/components/ui/Switch";
import { FlagsEffectReadout } from "./FlagsEffectReadout";
import { FlagsVisualizer } from "./FlagsVisualizer";

interface FlagsControlProps {
  important: boolean;
  exclusive: boolean;
  onImportantChange: (v: boolean) => void;
  onExclusiveChange: (v: boolean) => void;
}

export function FlagsControl({
  important,
  exclusive,
  onImportantChange,
  onExclusiveChange,
}: FlagsControlProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6">
        <FlagToggle
          id="flag-important"
          label="important"
          checked={important}
          onCheckedChange={onImportantChange}
          tooltip="Bypasses global cooldown and chance roll — always considered if eligible."
          testId="flag-important"
        />
        <FlagToggle
          id="flag-exclusive"
          label="exclusive"
          checked={exclusive}
          onCheckedChange={onExclusiveChange}
          tooltip="Prioritized over non-exclusive lines in the normal pool."
          testId="flag-exclusive"
        />
      </div>
      <FlagsEffectReadout important={important} exclusive={exclusive} />
      <FlagsVisualizer
        important={important}
        exclusive={exclusive}
        onSelectLane={(target) => {
          onImportantChange(target.important);
          onExclusiveChange(target.exclusive);
        }}
      />
    </div>
  );
}

function FlagToggle({
  id,
  label,
  checked,
  onCheckedChange,
  tooltip,
  testId,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  tooltip: string;
  testId: string;
}) {
  return (
    <div className="flex items-center gap-2" title={tooltip}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        data-testid={testId}
      />
      <label htmlFor={id} className="mono cursor-pointer text-xs select-none">
        {label}
      </label>
    </div>
  );
}
