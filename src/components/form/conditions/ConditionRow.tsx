import type { ReactNode } from "react";
import { Braces, CornerLeftUp, X, Ban, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BodySlotPicker } from "./BodySlotPicker";
import {
  ACTOR_VALUE_COMPARISONS,
  SIMPLE_COMPARISONS,
  COMMON_ACTOR_VALUES,
  COMMON_LOCATION_KEYWORDS,
  COMMON_LOCATION_EDITOR_IDS,
  COMMON_MAGIC_EFFECT_KEYWORDS,
  COMMON_RACE_EDITOR_IDS,
  type ArmorSlot,
  type ConditionType,
  type ActorValueComparison,
} from "@/lib/enums";
import type { Condition } from "@/lib/schema";
import { cn } from "@/lib/cn";

interface ConditionRowProps {
  condition: Condition;
  onChange: (next: Condition) => void;
  onRemove: () => void;
  onWrap?: () => void;
  onExtract?: () => void;
  /** Drag handle element rendered by the sortable wrapper. */
  dragHandle?: ReactNode;
  /** Path string for stable test-ids. */
  pathKey: string;
}

/**
 * Renders the inline editor for a single non-group condition. Every row
 * has the same chrome: type label + inline form + wrap/extract/delete
 * action group visible on hover.
 */
export function ConditionRow({
  condition,
  onChange,
  onRemove,
  onWrap,
  onExtract,
  dragHandle,
  pathKey,
}: ConditionRowProps) {
  const testId = `condition-row-${pathKey}`;
  const isNegated = "negated" in condition && condition.negated === true;
  const isDisabled = "disabled" in condition && condition.disabled === true;

  const toggleNegated = () => {
    onChange({ ...condition, negated: isNegated ? undefined : true } as Condition);
  };

  const toggleDisabled = () => {
    onChange({ ...condition, disabled: isDisabled ? undefined : true } as Condition);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-1 rounded-sm py-1.5 pr-1 hover:bg-accent/20",
        isDisabled && "opacity-40",
      )}
      data-testid={testId}
    >
      {dragHandle && (
        <div className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
          {dragHandle}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isDisabled && (
            <button
              type="button"
              onClick={toggleDisabled}
              className="mono rounded-sm bg-muted px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
              title="Re-enable condition"
              data-testid={`${testId}-off-badge`}
            >
              OFF
            </button>
          )}
          {isNegated && (
            <button
              type="button"
              onClick={toggleNegated}
              className="rounded-sm bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-destructive/25"
              title="Remove negation"
              data-testid={`${testId}-not-badge`}
            >
              NOT
            </button>
          )}
          <span
            className={cn(
              "mono text-[12px] font-medium text-foreground",
              isNegated && "line-through",
            )}
          >
            {condition.type}
          </span>
        </div>
        <div className="mt-1.5">
          <Editor condition={condition} onChange={onChange} pathKey={pathKey} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <ActionButton
          icon={<Ban className="h-3.5 w-3.5" />}
          title={isNegated ? "Remove negation" : "Negate condition"}
          ariaLabel="Toggle negation"
          onClick={toggleNegated}
          testId={`${testId}-negate`}
          active={isNegated}
          activeColor="text-destructive"
        />
        <ActionButton
          icon={<EyeOff className="h-3.5 w-3.5" />}
          title={isDisabled ? "Re-enable condition" : "Disable condition"}
          ariaLabel="Toggle disabled"
          onClick={toggleDisabled}
          testId={`${testId}-disable`}
          active={isDisabled}
          activeColor="text-muted-foreground"
        />
        {onWrap && (
          <ActionButton
            icon={<Braces className="h-3.5 w-3.5" />}
            title="Wrap in AND group"
            ariaLabel="Wrap in group"
            onClick={onWrap}
            testId={`${testId}-wrap`}
          />
        )}
        {onExtract && (
          <ActionButton
            icon={<CornerLeftUp className="h-3.5 w-3.5" />}
            title="Extract to parent"
            ariaLabel="Extract to parent"
            onClick={onExtract}
            testId={`${testId}-extract`}
          />
        )}
        <ActionButton
          icon={<X className="h-3.5 w-3.5" />}
          title="Remove condition"
          ariaLabel="Remove condition"
          onClick={onRemove}
          testId={`${testId}-remove`}
          destructive
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  title,
  ariaLabel,
  onClick,
  testId,
  destructive,
  active,
  activeColor,
}: {
  icon: React.ReactNode;
  title: string;
  ariaLabel: string;
  onClick: () => void;
  testId: string;
  destructive?: boolean;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors",
        active && activeColor
          ? activeColor
          : "text-muted-foreground/60",
        destructive
          ? "hover:bg-destructive/20 hover:text-destructive"
          : "hover:bg-accent hover:text-accent-foreground",
      )}
      title={title}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {icon}
    </button>
  );
}

// ---------- No-param condition labels ----------

const NO_PARAM_LABELS: Partial<Record<ConditionType, string>> = {
  IsInCombat: "in combat",
  IsWeaponDrawn: "has a weapon drawn",
  IsSneaking: "sneaking",
  IsSleeping: "sleeping",
  IsSwimming: "swimming",
  IsFemale: "a female character",
};

// ---------- Editor switch ----------

function Editor({
  condition,
  onChange,
  pathKey,
}: {
  condition: Condition;
  onChange: (next: Condition) => void;
  pathKey: string;
}) {
  const testId = `condition-editor-${pathKey}`;

  switch (condition.type) {
    case "IsInCombat":
    case "IsWeaponDrawn":
    case "IsSneaking":
    case "IsSleeping":
    case "IsSwimming":
    case "IsFemale":
      return (
        <p className="text-[12px] text-muted-foreground/70">
          No parameters — passes when the player is{" "}
          <span className="mono text-foreground">
            {NO_PARAM_LABELS[condition.type] ?? condition.type}
          </span>
          .
        </p>
      );

    case "ActorValue": {
      const isPercent = condition.comparison.startsWith("percent");
      return (
        <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
          <div className="w-36">
            <Input
              list={`${testId}-values`}
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              placeholder="Health"
              data-testid={`${testId}-value`}
            />
            <datalist id={`${testId}-values`}>
              {COMMON_ACTOR_VALUES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
          <div className="w-36">
            <Select
              value={condition.comparison}
              onChange={(e) =>
                onChange({
                  ...condition,
                  comparison: e.target.value as typeof condition.comparison,
                })
              }
              data-testid={`${testId}-comparison`}
            >
              {ACTOR_VALUE_COMPARISONS.map((c) => (
                <option key={c} value={c}>
                  {labelForComparison(c)}
                </option>
              ))}
            </Select>
          </div>
          <div className="relative w-28">
            <Input
              type="number"
              value={Number.isFinite(condition.threshold) ? condition.threshold : 0}
              onChange={(e) =>
                onChange({ ...condition, threshold: parseFloat(e.target.value) || 0 })
              }
              step={isPercent ? 0.05 : 1}
              min={isPercent ? 0 : undefined}
              max={isPercent ? 1 : undefined}
              className="pr-7"
              data-testid={`${testId}-threshold`}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {isPercent ? "%·" : "raw"}
            </span>
          </div>
          {isPercent && (
            <span className="mono text-[11px] text-muted-foreground">
              = {Math.round(condition.threshold * 100)}%
            </span>
          )}
        </div>
      );
    }

    case "IsRace": {
      const mode: "race" | "formID" =
        condition.formID && condition.formID.length > 0 ? "formID" : "race";
      return (
        <div className="space-y-1.5" data-testid={testId}>
          <div
            className="inline-flex h-7 rounded-sm border border-border bg-input p-[2px]"
            role="radiogroup"
            aria-label="Race ref mode"
          >
            {(["race", "formID"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  if (m === "race") {
                    onChange({ type: "IsRace", race: condition.race || "NordRace" });
                  } else {
                    onChange({ type: "IsRace", formID: condition.formID || "" });
                  }
                }}
                className={cn(
                  "mono cursor-pointer rounded-sm px-2 text-[11px] transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`${testId}-mode-${m}`}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === "race" ? (
            <div className="w-full max-w-xs">
              <Input
                list={`${testId}-races`}
                value={condition.race ?? ""}
                onChange={(e) =>
                  onChange({ type: "IsRace", race: e.target.value })
                }
                placeholder="NordRace"
                data-testid={`${testId}-race`}
              />
              <datalist id={`${testId}-races`}>
                {COMMON_RACE_EDITOR_IDS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="w-full max-w-xs">
              <Input
                value={condition.formID ?? ""}
                onChange={(e) =>
                  onChange({ type: "IsRace", formID: e.target.value })
                }
                placeholder="Skyrim.esm|0x00013746"
                data-testid={`${testId}-formid`}
                className="mono"
              />
            </div>
          )}
        </div>
      );
    }

    case "HasActiveEffect": {
      const mode: "keyword" | "formID" =
        condition.formID && condition.formID.length > 0 ? "formID" : "keyword";
      return (
        <div className="space-y-1.5" data-testid={testId}>
          <div
            className="inline-flex h-7 rounded-sm border border-border bg-input p-[2px]"
            role="radiogroup"
            aria-label="Effect ref mode"
          >
            {(["keyword", "formID"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  if (m === "keyword") {
                    onChange({ type: "HasActiveEffect", keyword: condition.keyword || "MagicDamageHealth" });
                  } else {
                    onChange({ type: "HasActiveEffect", formID: condition.formID || "" });
                  }
                }}
                className={cn(
                  "mono cursor-pointer rounded-sm px-2 text-[11px] transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`${testId}-mode-${m}`}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === "keyword" ? (
            <div className="w-full max-w-xs">
              <Input
                list={`${testId}-keywords`}
                value={condition.keyword ?? ""}
                onChange={(e) =>
                  onChange({ type: "HasActiveEffect", keyword: e.target.value })
                }
                placeholder="MagicDamageHealth"
                data-testid={`${testId}-keyword`}
              />
              <datalist id={`${testId}-keywords`}>
                {COMMON_MAGIC_EFFECT_KEYWORDS.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="w-full max-w-xs">
              <Input
                value={condition.formID ?? ""}
                onChange={(e) =>
                  onChange({ type: "HasActiveEffect", formID: e.target.value })
                }
                placeholder="Skyrim.esm|0x00012345"
                data-testid={`${testId}-formid`}
                className="mono"
              />
            </div>
          )}
        </div>
      );
    }

    case "HasPerk":
    case "HasSpell":
      return (
        <div className="w-full max-w-xs" data-testid={testId}>
          <Input
            value={condition.formID}
            onChange={(e) =>
              onChange({ ...condition, formID: e.target.value })
            }
            placeholder="Skyrim.esm|0x000BABED"
            data-testid={`${testId}-formid`}
            className="mono"
          />
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Plugin-qualified form ID (Plugin.esp|0xHEX)
          </p>
        </div>
      );

    case "IsSlotEmpty":
      return (
        <BodySlotPicker
          slots={(condition.slots ?? []) as readonly ArmorSlot[]}
          onChange={(next) =>
            onChange({ type: "IsSlotEmpty", slots: next.length > 0 ? next : undefined })
          }
          data-testid={testId}
        />
      );

    case "LocationHasKeyword":
      return (
        <div className="w-full max-w-xs" data-testid={testId}>
          <Input
            list={`${testId}-keywords`}
            value={condition.keyword}
            onChange={(e) =>
              onChange({ type: "LocationHasKeyword", keyword: e.target.value })
            }
            placeholder="LocTypeDungeon"
            data-testid={`${testId}-keyword`}
          />
          <datalist id={`${testId}-keywords`}>
            {COMMON_LOCATION_KEYWORDS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>
      );

    case "PlayerName":
      return (
        <div className="w-full max-w-xs" data-testid={testId}>
          <Input
            value={condition.name}
            onChange={(e) =>
              onChange({ ...condition, name: e.target.value })
            }
            placeholder="Dragonborn"
            data-testid={`${testId}-name`}
          />
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Exact character name (case-sensitive)
          </p>
        </div>
      );

    case "IsLocation": {
      const mode: "location" | "formID" =
        condition.formID && condition.formID.length > 0 ? "formID" : "location";
      return (
        <div className="space-y-1.5" data-testid={testId}>
          <div
            className="inline-flex h-7 rounded-sm border border-border bg-input p-[2px]"
            role="radiogroup"
            aria-label="Location ref mode"
          >
            {(["location", "formID"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  if (m === "location") {
                    onChange({ type: "IsLocation", location: condition.location || "WhiterunLocation" });
                  } else {
                    onChange({ type: "IsLocation", formID: condition.formID || "" });
                  }
                }}
                className={cn(
                  "mono cursor-pointer rounded-sm px-2 text-[11px] transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`${testId}-mode-${m}`}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === "location" ? (
            <div className="w-full max-w-xs">
              <Input
                list={`${testId}-locations`}
                value={condition.location ?? ""}
                onChange={(e) =>
                  onChange({ type: "IsLocation", location: e.target.value })
                }
                placeholder="WhiterunLocation"
                data-testid={`${testId}-location`}
              />
              <datalist id={`${testId}-locations`}>
                {COMMON_LOCATION_EDITOR_IDS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="w-full max-w-xs">
              <Input
                value={condition.formID ?? ""}
                onChange={(e) =>
                  onChange({ type: "IsLocation", formID: e.target.value })
                }
                placeholder="Skyrim.esm|0x00018A56"
                data-testid={`${testId}-formid`}
                className="mono"
              />
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Traverses parent chain — matching a hold covers all locations within it.
          </p>
        </div>
      );
    }

    case "NPCsNearby": {
      return (
        <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
          <div className="relative w-28">
            <Input
              type="number"
              value={Number.isFinite(condition.radius) ? condition.radius : 2048}
              onChange={(e) =>
                onChange({ ...condition, radius: parseFloat(e.target.value) || 0 })
              }
              step={256}
              min={0}
              className="pr-9"
              data-testid={`${testId}-radius`}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              units
            </span>
          </div>
          <div className="w-24">
            <Select
              value={condition.comparison ?? "greaterOrEqual"}
              onChange={(e) =>
                onChange({
                  ...condition,
                  comparison: e.target.value as typeof condition.comparison,
                })
              }
              data-testid={`${testId}-comparison`}
            >
              {SIMPLE_COMPARISONS.map((c) => (
                <option key={c} value={c}>
                  {COMPARISON_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-20">
            <Input
              type="number"
              value={Number.isFinite(condition.count) ? condition.count : 1}
              onChange={(e) =>
                onChange({ ...condition, count: parseInt(e.target.value, 10) || 0 })
              }
              step={1}
              min={0}
              data-testid={`${testId}-count`}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">NPCs nearby</span>
        </div>
      );
    }

    case "ConditionGroup":
      // Groups are rendered by ConditionGroupRow — unreachable here.
      return null;
  }
}

const COMPARISON_LABELS: Record<ActorValueComparison, string> = {
  below: "<",
  above: ">",
  equals: "==",
  notEquals: "!=",
  greaterOrEqual: ">=",
  lessOrEqual: "<=",
  percentBelow: "% <",
  percentAbove: "% >",
  percentEquals: "% ==",
  percentNotEquals: "% !=",
  percentGreaterOrEqual: "% >=",
  percentLessOrEqual: "% <=",
};

function labelForComparison(c: ActorValueComparison): string {
  return COMPARISON_LABELS[c];
}
