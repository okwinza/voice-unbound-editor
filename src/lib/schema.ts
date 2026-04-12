/**
 * Zod schema for a Voice Unbound voice-line JSON config.
 *
 * This is the parse-time contract. Semantic validation (filter-key whitelisting
 * per event, form-ref resolution, event-name typo detection) lives in
 * validator.ts since it requires information beyond what Zod can express.
 *
 * Schema source of truth:
 *   - VoiceUnbound/src/ConfigScanner.cpp         (field names + defaults)
 *   - VoiceUnbound/src/Conditions.cpp            (condition types)
 *   - VoiceUnbound/EVENTS.md                     (filter values)
 */

import { z } from "zod";
import {
  KNOWN_EVENTS,
  CONDITION_TYPES,
  ACTOR_VALUE_COMPARISONS,
  SIMPLE_COMPARISONS,
  ARMOR_SLOTS,
  CONDITION_GROUP_LOGICS,
  WEATHER_KINDS,
  QUEST_STATES,
  WEAPON_KINDS,
  WEAPON_HANDS,
} from "./enums";

// ---------- Filter values ----------
// Filter values are scalar-or-array of strings OR numbers. Most filter
// keys take string context fields the plugin compares by string-equality;
// FallEvent's `after_seconds` is a JSON number (or number array) matched
// against an airtime threshold.
const FilterValue = z.union([
  z.string(),
  z.number(),
  z.array(z.string()).min(1),
  z.array(z.number()).min(1),
]);

const EventFilter = z.record(z.string(), FilterValue).optional();

// ---------- Conditions (discriminated union) ----------

// Universal flags supported by every condition type (plugin commit 6a5af16).
// absent = false. Editor only writes when true; json-io strips undefined.
const conditionBaseShape = {
  negated: z.boolean().optional(),
  disabled: z.boolean().optional(),
  reference: z.string().min(1).optional(),
} as const;

const ActorValueConditionSchema = z.object({
  type: z.literal("ActorValue"),
  ...conditionBaseShape,
  value: z.string().min(1),
  comparison: z.enum(ACTOR_VALUE_COMPARISONS),
  threshold: z.number(),
});

const IsInCombatConditionSchema = z.object({
  type: z.literal("IsInCombat"),
  ...conditionBaseShape,
});

const IsWeaponDrawnConditionSchema = z.object({
  type: z.literal("IsWeaponDrawn"),
  ...conditionBaseShape,
});

const IsSneakingConditionSchema = z.object({
  type: z.literal("IsSneaking"),
  ...conditionBaseShape,
});

const IsSleepingConditionSchema = z.object({
  type: z.literal("IsSleeping"),
  ...conditionBaseShape,
});

const IsInteriorConditionSchema = z.object({
  type: z.literal("IsInterior"),
  ...conditionBaseShape,
});

const IsSwimmingConditionSchema = z.object({
  type: z.literal("IsSwimming"),
  ...conditionBaseShape,
});

const IsFemaleConditionSchema = z.object({
  type: z.literal("IsFemale"),
  ...conditionBaseShape,
});

const IsRaceConditionSchema = z
  .object({
    type: z.literal("IsRace"),
    ...conditionBaseShape,
    race: z.string().optional(),
    formID: z.string().optional(),
  })
  .refine((v) => !!v.race || !!v.formID, {
    message: "IsRace requires either `race` or `formID`",
    path: ["race"],
  });

const HasActiveEffectConditionSchema = z
  .object({
    type: z.literal("HasActiveEffect"),
    ...conditionBaseShape,
    keyword: z.string().optional(),
    formID: z.string().optional(),
  })
  .refine((v) => !!v.keyword || !!v.formID, {
    message: "HasActiveEffect requires either `keyword` or `formID`",
    path: ["keyword"],
  });

const HasPerkConditionSchema = z.object({
  type: z.literal("HasPerk"),
  ...conditionBaseShape,
  formID: z.string().min(1),
});

const HasSpellConditionSchema = z.object({
  type: z.literal("HasSpell"),
  ...conditionBaseShape,
  formID: z.string().min(1),
});

const IsSlotEmptyConditionSchema = z.object({
  type: z.literal("IsSlotEmpty"),
  ...conditionBaseShape,
  slots: z.array(z.enum(ARMOR_SLOTS)).min(1).optional(),
});

const LocationHasKeywordConditionSchema = z.object({
  type: z.literal("LocationHasKeyword"),
  ...conditionBaseShape,
  keyword: z.string().min(1),
});

const PlayerNameConditionSchema = z.object({
  type: z.literal("PlayerName"),
  ...conditionBaseShape,
  name: z.string().min(1),
});

const NPCsNearbyConditionSchema = z.object({
  type: z.literal("NPCsNearby"),
  ...conditionBaseShape,
  radius: z.number().min(0).optional(),
  comparison: z.enum(SIMPLE_COMPARISONS).optional(),
  count: z.number().int().min(0).optional(),
});

const IsLocationConditionSchema = z
  .object({
    type: z.literal("IsLocation"),
    ...conditionBaseShape,
    location: z.string().optional(),
    formID: z.string().optional(),
  })
  .refine((v) => !!v.location || !!v.formID, {
    message: "IsLocation requires either `location` or `formID`",
    path: ["location"],
  });

// --- Batch A: Movement & stance (zero-param) ---

const IsRunningConditionSchema = z.object({ type: z.literal("IsRunning"), ...conditionBaseShape });
const IsSprintingConditionSchema = z.object({ type: z.literal("IsSprinting"), ...conditionBaseShape });
const IsWalkingConditionSchema = z.object({ type: z.literal("IsWalking"), ...conditionBaseShape });
const IsBlockingConditionSchema = z.object({ type: z.literal("IsBlocking"), ...conditionBaseShape });
const IsBleedingOutConditionSchema = z.object({ type: z.literal("IsBleedingOut"), ...conditionBaseShape });
const IsOnMountConditionSchema = z.object({ type: z.literal("IsOnMount"), ...conditionBaseShape });
const IsFlyingConditionSchema = z.object({ type: z.literal("IsFlying"), ...conditionBaseShape });
const IsTrespassingConditionSchema = z.object({ type: z.literal("IsTrespassing"), ...conditionBaseShape });

// --- Batch B: Numeric comparisons ---

const PlayerLevelConditionSchema = z.object({
  type: z.literal("PlayerLevel"),
  ...conditionBaseShape,
  comparison: z.enum(SIMPLE_COMPARISONS).optional(),
  threshold: z.number().int().optional(),
});

const GoldAmountConditionSchema = z.object({
  type: z.literal("GoldAmount"),
  ...conditionBaseShape,
  comparison: z.enum(SIMPLE_COMPARISONS).optional(),
  threshold: z.number().int().optional(),
});

const TimeOfDayConditionSchema = z
  .object({
    type: z.literal("TimeOfDay"),
    ...conditionBaseShape,
    min: z.number().min(0).max(24).optional(),
    max: z.number().min(0).max(24).optional(),
  })
  .refine((v) => v.min !== undefined || v.max !== undefined, {
    message: "TimeOfDay requires at least 'min' or 'max'",
    path: ["min"],
  });

// --- Batch C: Environment ---

const IsInFactionConditionSchema = z.object({
  type: z.literal("IsInFaction"),
  ...conditionBaseShape,
  formID: z.string().min(1),
});

const IsInWorldspaceConditionSchema = z.object({
  type: z.literal("IsInWorldspace"),
  ...conditionBaseShape,
  formID: z.string().min(1),
});

const WeatherIsConditionSchema = z.object({
  type: z.literal("WeatherIs"),
  ...conditionBaseShape,
  kind: z.enum(WEATHER_KINDS),
});

const IsCurrentWeatherConditionSchema = z.object({
  type: z.literal("IsCurrentWeather"),
  ...conditionBaseShape,
  formID: z.string().min(1),
});

// --- Batch D: Quest state ---

const QuestStageConditionSchema = z.object({
  type: z.literal("QuestStage"),
  ...conditionBaseShape,
  formID: z.string().min(1),
  comparison: z.enum(SIMPLE_COMPARISONS).optional(),
  stage: z.number().int().min(0).max(65535).optional(),
});

const QuestStateConditionSchema = z.object({
  type: z.literal("QuestState"),
  ...conditionBaseShape,
  formID: z.string().min(1),
  state: z.enum(QUEST_STATES),
});

// --- Batch E: Equipment ---

const EquippedWeaponTypeConditionSchema = z.object({
  type: z.literal("EquippedWeaponType"),
  ...conditionBaseShape,
  kind: z.enum(WEAPON_KINDS),
  hand: z.enum(WEAPON_HANDS).optional(),
});

// ConditionGroup is recursive. Zod needs a lazy ref for that.
type ConditionInput =
  | z.infer<typeof ActorValueConditionSchema>
  | z.infer<typeof IsInCombatConditionSchema>
  | z.infer<typeof IsWeaponDrawnConditionSchema>
  | z.infer<typeof IsSneakingConditionSchema>
  | z.infer<typeof IsSleepingConditionSchema>
  | z.infer<typeof IsInteriorConditionSchema>
  | z.infer<typeof IsSwimmingConditionSchema>
  | z.infer<typeof IsFemaleConditionSchema>
  | z.infer<typeof IsRaceConditionSchema>
  | z.infer<typeof HasActiveEffectConditionSchema>
  | z.infer<typeof HasPerkConditionSchema>
  | z.infer<typeof HasSpellConditionSchema>
  | z.infer<typeof IsSlotEmptyConditionSchema>
  | z.infer<typeof LocationHasKeywordConditionSchema>
  | z.infer<typeof PlayerNameConditionSchema>
  | z.infer<typeof NPCsNearbyConditionSchema>
  | z.infer<typeof IsLocationConditionSchema>
  | z.infer<typeof IsRunningConditionSchema>
  | z.infer<typeof IsSprintingConditionSchema>
  | z.infer<typeof IsWalkingConditionSchema>
  | z.infer<typeof IsBlockingConditionSchema>
  | z.infer<typeof IsBleedingOutConditionSchema>
  | z.infer<typeof IsOnMountConditionSchema>
  | z.infer<typeof IsFlyingConditionSchema>
  | z.infer<typeof IsTrespassingConditionSchema>
  | z.infer<typeof PlayerLevelConditionSchema>
  | z.infer<typeof GoldAmountConditionSchema>
  | z.infer<typeof TimeOfDayConditionSchema>
  | z.infer<typeof IsInFactionConditionSchema>
  | z.infer<typeof IsInWorldspaceConditionSchema>
  | z.infer<typeof WeatherIsConditionSchema>
  | z.infer<typeof IsCurrentWeatherConditionSchema>
  | z.infer<typeof QuestStageConditionSchema>
  | z.infer<typeof QuestStateConditionSchema>
  | z.infer<typeof EquippedWeaponTypeConditionSchema>
  | {
      type: "ConditionGroup";
      negated?: boolean;
      disabled?: boolean;
      reference?: string;
      logic?: "AND" | "OR";
      conditions?: ConditionInput[];
    };

export const ConditionSchema: z.ZodType<ConditionInput> = z.lazy(() =>
  z.discriminatedUnion("type", [
    ActorValueConditionSchema,
    IsInCombatConditionSchema,
    IsWeaponDrawnConditionSchema,
    IsSneakingConditionSchema,
    IsSleepingConditionSchema,
    IsInteriorConditionSchema,
    IsSwimmingConditionSchema,
    IsFemaleConditionSchema,
    IsRaceConditionSchema,
    HasActiveEffectConditionSchema,
    HasPerkConditionSchema,
    HasSpellConditionSchema,
    IsSlotEmptyConditionSchema,
    LocationHasKeywordConditionSchema,
    PlayerNameConditionSchema,
    NPCsNearbyConditionSchema,
    IsLocationConditionSchema,
    IsRunningConditionSchema,
    IsSprintingConditionSchema,
    IsWalkingConditionSchema,
    IsBlockingConditionSchema,
    IsBleedingOutConditionSchema,
    IsOnMountConditionSchema,
    IsFlyingConditionSchema,
    IsTrespassingConditionSchema,
    PlayerLevelConditionSchema,
    GoldAmountConditionSchema,
    TimeOfDayConditionSchema,
    IsInFactionConditionSchema,
    IsInWorldspaceConditionSchema,
    WeatherIsConditionSchema,
    IsCurrentWeatherConditionSchema,
    QuestStageConditionSchema,
    QuestStateConditionSchema,
    EquippedWeaponTypeConditionSchema,
    z.object({
      type: z.literal("ConditionGroup"),
      ...conditionBaseShape,
      logic: z.enum(CONDITION_GROUP_LOGICS).optional(),
      conditions: z.array(ConditionSchema).optional(),
    }),
  ]),
);

export type Condition = ConditionInput;

// ---------- Subtitle + Lipsync ----------

// Nested object as of the plugin's recent schema change. The scanner
// no longer accepts flat `subtitle: string` + `subtitle_duration_ms` —
// it warns and skips. Both subfields are optional so the user can
// gradually fill the object as they author.
const SubtitleSchema = z
  .object({
    text: z.string().optional(),
    duration_ms: z.number().int().min(0).max(60_000).optional(),
  })
  .optional();

// Per-line lipsync control. Mirrors the plugin's `lipsync` field —
// `enabled` defaults to true, `intensity` overrides the global INI
// baseline when present (nullopt = fall back to [LipSync] fIntensity).
const LipsyncSchema = z
  .object({
    enabled: z.boolean().optional(),
    intensity: z.number().optional(),
  })
  .optional();

// ---------- Clip (multi-clip voice lines) ----------

const ClipSchema = z.object({
  wav: z.string().optional(),
  subtitle: SubtitleSchema,
  lipsync: LipsyncSchema,
});

export type Clip = z.infer<typeof ClipSchema>;

// ---------- VoiceLine (top-level) ----------

export const VoiceLineSchema = z.object({
  event: z.enum(KNOWN_EVENTS),
  speaker: z.string().min(1).optional(),
  event_filter: EventFilter,
  subtitle: SubtitleSchema,
  chance: z.number().min(0).max(1).optional(),
  cooldown_seconds: z.number().min(0).optional(),
  exclusive: z.boolean().optional(),
  important: z.boolean().optional(),
  play_once: z.boolean().optional(),
  lipsync: LipsyncSchema,
  suppress_subtypes: z.array(z.number().int().min(0).max(65535)).optional(),
  clips: z.array(ClipSchema).min(1).optional(),
  conditions: z.array(ConditionSchema).optional(),
});

export type VoiceLine = z.infer<typeof VoiceLineSchema>;

// ---------- Permissive import schema ----------

/**
 * For round-tripping hand-edited files we want to preserve unknown fields
 * AND surface typos (e.g. event="TesCombatEvent"). This permissive variant
 * lets any string through for `event`; the validator flags it.
 */
export const VoiceLinePermissiveSchema = VoiceLineSchema.omit({
  event: true,
}).extend({
  event: z.string().min(1),
});

export type VoiceLinePermissive = z.infer<typeof VoiceLinePermissiveSchema>;

// ---------- Factories ----------

export function emptyVoiceLine(event: (typeof KNOWN_EVENTS)[number] = "TESHitEvent"): VoiceLine {
  return {
    event,
    subtitle: { text: "", duration_ms: 3000 },
    chance: 1.0,
    cooldown_seconds: 30.0,
  };
}

export function emptyClip(): Clip {
  return { subtitle: { text: "", duration_ms: 3000 } };
}

export function emptyCondition(type: (typeof CONDITION_TYPES)[number]): Condition {
  switch (type) {
    case "ActorValue":
      return { type, value: "Health", comparison: "percentBelow", threshold: 0.5 };
    case "IsInCombat":
    case "IsWeaponDrawn":
    case "IsSneaking":
    case "IsSleeping":
    case "IsInterior":
    case "IsSwimming":
    case "IsFemale":
    case "IsRunning":
    case "IsSprinting":
    case "IsWalking":
    case "IsBlocking":
    case "IsBleedingOut":
    case "IsOnMount":
    case "IsFlying":
    case "IsTrespassing":
      return { type };
    case "IsRace":
      return { type, race: "NordRace" };
    case "HasActiveEffect":
      return { type, keyword: "MagicDamageHealth" };
    case "HasPerk":
      return { type, formID: "" };
    case "HasSpell":
      return { type, formID: "" };
    case "IsSlotEmpty":
      return { type, slots: ["body"] };
    case "LocationHasKeyword":
      return { type, keyword: "LocTypeDungeon" };
    case "PlayerName":
      return { type, name: "" };
    case "NPCsNearby":
      return { type, radius: 2048, comparison: "greaterOrEqual", count: 1 };
    case "IsLocation":
      return { type, location: "WhiterunLocation" };
    case "PlayerLevel":
      return { type, comparison: "greaterOrEqual", threshold: 10 };
    case "GoldAmount":
      return { type, comparison: "greaterOrEqual", threshold: 100 };
    case "TimeOfDay":
      return { type, min: 6, max: 22 };
    case "IsInFaction":
    case "IsInWorldspace":
    case "IsCurrentWeather":
      return { type, formID: "" };
    case "QuestStage":
      return { type, formID: "" };
    case "QuestState":
      return { type, formID: "", state: "running" };
    case "WeatherIs":
      return { type, kind: "raining" };
    case "EquippedWeaponType":
      return { type, kind: "sword" };
    case "ConditionGroup":
      return { type, logic: "AND", conditions: [] };
    default: {
      const _exhaustive: never = type;
      throw new Error(`No factory for condition type: ${_exhaustive}`);
    }
  }
}
