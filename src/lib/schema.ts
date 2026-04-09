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
  | {
      type: "ConditionGroup";
      negated?: boolean;
      disabled?: boolean;
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

// ---------- VoiceLine (top-level) ----------

export const VoiceLineSchema = z.object({
  event: z.enum(KNOWN_EVENTS),
  event_filter: EventFilter,
  subtitle: SubtitleSchema,
  chance: z.number().min(0).max(1).optional(),
  cooldown_seconds: z.number().min(0).optional(),
  exclusive: z.boolean().optional(),
  important: z.boolean().optional(),
  lipsync: LipsyncSchema,
  suppress_subtypes: z.array(z.number().int().min(0).max(65535)).optional(),
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
    case "ConditionGroup":
      return { type, logic: "AND", conditions: [] };
  }
}
