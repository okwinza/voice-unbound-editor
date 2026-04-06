import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  useStringField,
  useNumberField,
  useBoolField,
  useNestedStringField,
  useNestedNumberField,
  useNestedBoolField,
  useNestedPatcher,
} from "@/stores/use-document-field";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { NumberWithUnit } from "@/components/form/inputs/NumberWithUnit";
import { DurationInput } from "@/components/form/inputs/DurationInput";
import { FlagsControl } from "@/components/form/inputs/FlagsControl";
import { SectionHeader } from "@/components/form/SectionHeader";
import { KNOWN_EVENTS } from "@/lib/enums";
import { EVENT_META } from "@/lib/event-meta";

interface GeneralSectionProps {
  path: string;
}

export function GeneralSection({ path }: GeneralSectionProps) {
  const patchDom = useWorkspaceStore((s) => s.patchDom);

  const event = useStringField(path, "event", "TESHitEvent");
  const subtitle = useNestedStringField(path, "subtitle", "text", "");
  const subtitleDuration = useNestedNumberField(
    path,
    "subtitle",
    "duration_ms",
    3000,
  );
  const chance = useNumberField(path, "chance", 1);
  const cooldown = useNumberField(path, "cooldown_seconds", 30);
  const important = useBoolField(path, "important", false);
  const exclusive = useBoolField(path, "exclusive", false);
  const lipsyncEnabled = useNestedBoolField(path, "lipsync", "enabled", true);
  // NaN fallback lets us distinguish "unset" (show "baseline" label, slider
  // sits at 1) from "explicitly set to 1" without a second subscription.
  const lipsyncIntensityRaw = useNestedNumberField(
    path,
    "lipsync",
    "intensity",
    Number.NaN,
  );
  const lipsyncIntensitySet = !Number.isNaN(lipsyncIntensityRaw);
  const lipsyncIntensity = lipsyncIntensitySet ? lipsyncIntensityRaw : 1;

  const patch = (fields: Record<string, unknown>) => patchDom(path, fields);
  const patchSubtitle = useNestedPatcher(path, "subtitle");
  const patchLipsync = useNestedPatcher(path, "lipsync");

  return (
    <section
      id="section-general"
      data-section="general"
      className="space-y-5"
      data-testid="section-general"
    >
      <SectionHeader numeral="I" title="General" />

      <Field label="Event" htmlFor="field-event">
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-xs">
            <Select
              id="field-event"
              value={event}
              onChange={(e) => patch({ event: e.target.value })}
              data-testid="field-event"
            >
              {KNOWN_EVENTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <EventBadge event={event} />
        </div>
        <EventHelp event={event} />
      </Field>

      <Field label="Subtitle" htmlFor="field-subtitle">
        <Textarea
          id="field-subtitle"
          value={subtitle}
          onChange={(e) => patchSubtitle("text", e.target.value)}
          placeholder="What the player speaks…"
          data-testid="field-subtitle"
        />
      </Field>

      <Field label="Duration" htmlFor="field-duration">
        <NumberWithUnit
          id="field-duration"
          value={subtitleDuration}
          onChange={(v) =>
            patchSubtitle("duration_ms", Math.max(0, Math.round(v)))
          }
          unit="ms"
          min={0}
          max={60000}
          step={100}
          presets={[
            { label: "1s", value: 1000 },
            { label: "2s", value: 2000 },
            { label: "3s", value: 3000 },
            { label: "5s", value: 5000 },
          ]}
          data-testid="field-duration"
        />
      </Field>

      <Field label="Chance" htmlFor="field-chance">
        <div className="flex items-center gap-3 max-w-xs">
          <Slider
            id="field-chance"
            value={chance}
            onValueChange={(v) => patch({ chance: Number(v.toFixed(2)) })}
            min={0}
            max={1}
            step={0.05}
            aria-label="Chance"
            data-testid="field-chance"
          />
          <div className="flex w-20 shrink-0 items-baseline justify-end gap-1.5">
            <span className="mono text-xs tabular-nums" data-testid="chance-readout">
              {chance.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(chance * 100)}%
            </span>
          </div>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          Stored as 0.0–1.0 float. Used as weight in weighted-random selection.
        </p>
      </Field>

      <Field label="Cooldown" htmlFor="field-cooldown">
        <DurationInput
          id="field-cooldown"
          value={cooldown}
          onChange={(s) => patch({ cooldown_seconds: Math.max(0, s) })}
          data-testid="field-cooldown"
        />
      </Field>

      <Field label="Flags">
        <FlagsControl
          important={important}
          exclusive={exclusive}
          onImportantChange={(v) => patch({ important: v || undefined })}
          onExclusiveChange={(v) => patch({ exclusive: v || undefined })}
        />
      </Field>

      <Field label="Lipsync">
        <LipsyncRow
          enabled={lipsyncEnabled}
          intensity={lipsyncIntensity}
          intensitySet={lipsyncIntensitySet}
          onEnabledChange={(v) =>
            patchLipsync("enabled", v ? undefined : false)
          }
          onIntensityChange={(v) =>
            patchLipsync("intensity", Number(v.toFixed(2)))
          }
          onIntensityClear={() => patchLipsync("intensity", undefined)}
        />
      </Field>
    </section>
  );
}

function LipsyncRow({
  enabled,
  intensity,
  intensitySet,
  onEnabledChange,
  onIntensityChange,
  onIntensityClear,
}: {
  enabled: boolean;
  intensity: number;
  intensitySet: boolean;
  onEnabledChange: (v: boolean) => void;
  onIntensityChange: (v: number) => void;
  onIntensityClear: () => void;
}) {
  return (
    <div className="space-y-2 max-w-md">
      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
          data-testid="field-lipsync-enabled"
        />
        <span className="font-medium text-foreground">Enabled</span>
        <span className="text-[10px] text-muted-foreground">
          plays mouth animation synced to the wav
        </span>
      </label>
      {enabled && (
        <div className="flex items-center gap-3 border-l-2 border-border pl-3">
          <Slider
            value={intensity}
            onValueChange={onIntensityChange}
            min={0}
            max={2}
            step={0.05}
            aria-label="Lipsync intensity"
            data-testid="field-lipsync-intensity"
          />
          <div className="flex w-24 shrink-0 items-baseline justify-end gap-1.5">
            <span
              className="mono text-xs tabular-nums"
              data-testid="lipsync-intensity-readout"
            >
              {intensitySet ? intensity.toFixed(2) : "baseline"}
            </span>
            {intensitySet && (
              <button
                type="button"
                onClick={onIntensityClear}
                className="text-[9px] text-muted-foreground hover:text-primary"
                title="Revert to global baseline"
                data-testid="field-lipsync-intensity-clear"
              >
                clear
              </button>
            )}
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/70">
        Intensity overrides the INI baseline ([LipSync] fIntensity) for this
        line only. Leave unset to use the global value.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
      <Label htmlFor={htmlFor} className="pt-2">
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function EventBadge({ event }: { event: string }) {
  const meta = EVENT_META[event as keyof typeof EVENT_META];
  if (!meta) return null;
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white/90 ${meta.bgClass}`}
    >
      {meta.label}
    </span>
  );
}

function EventHelp({ event }: { event: string }) {
  const meta = EVENT_META[event as keyof typeof EVENT_META];
  if (!meta) return null;
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">{meta.summary}</p>
  );
}
