/**
 * Schema enum tables — the single source of truth for "what values are allowed
 * where" in a Voice Unbound config.json.
 *
 * All values are copied from the plugin's own source files and cross-referenced
 * in comments. If the plugin ever adds a new event, condition, or filter key,
 * only this file needs to change.
 *
 * Sources:
 *   - VoiceUnbound/EVENTS.md
 *   - VoiceUnbound/src/ConfigScanner.cpp:6-10          (kKnownEvents)
 *   - VoiceUnbound/src/Conditions.cpp:120-208          (condition types)
 *   - VoiceUnbound/src/EventSink.cpp                   (context field names)
 *   - VoiceUnbound/src/PeriodicPoller.cpp:25-28        (periodic context)
 *   - VoiceUnbound/src/Conditions.cpp:73-85            (slot names)
 */

// ---------- Events ----------

export const KNOWN_EVENTS = [
  "TESHitEvent",
  "TESCombatEvent",
  "TESDeathEvent",
  "TESEnterBleedoutEvent",
  "TESSpellCastEvent",
  "TESPlayerBowShotEvent",
  "TESActorLocationChangeEvent",
  "LevelUpEvent",
  "SkillIncreaseEvent",
  "AnimationEvent",
  "FallEvent",
  "periodic",
] as const;

/** Scalar or array of strings OR numbers — matches the Zod FilterValue. */
export type FilterValue = string | string[] | number | number[];

export type EventName = (typeof KNOWN_EVENTS)[number];

// ---------- Filter keys per event ----------

/**
 * "kind" determines the value widget:
 *   - "actor"         → SegmentedActorSelect (player | npc | form-ref)
 *   - "enum"          → Select over fixed values
 *   - "boolString"    → Select over "true"/"false" (string-compared in plugin)
 *   - "formRef"       → FormRefInput (Plugin.esp|0xHEX only, no player/npc)
 *   - "stringList"    → ChipInput for free-form strings (single or array)
 *   - "numberList"    → NumberChipInput for JSON numbers (single or array)
 */
export type FilterKind = "actor" | "enum" | "boolString" | "formRef" | "stringList" | "numberList";

export interface FilterKeySpec {
  key: string;
  kind: FilterKind;
  /** Allowed literal values. For form-ref keys this is empty. */
  values: readonly string[];
  /** Short description shown in tooltip. */
  description: string;
}

const ACTOR_STRINGS = ["player", "npc"] as const;

export const FILTER_KEYS_PER_EVENT: Record<EventName, readonly FilterKeySpec[]> = {
  TESHitEvent: [
    {
      key: "target",
      kind: "actor",
      values: ACTOR_STRINGS,
      description: "Who was hit.",
    },
    {
      key: "aggressor",
      kind: "actor",
      values: ACTOR_STRINGS,
      description: "Who dealt the hit.",
    },
  ],
  TESCombatEvent: [
    {
      key: "actor",
      kind: "actor",
      values: ["player"],
      description: "Always `player` — NPC combat events are not forwarded.",
    },
    {
      key: "new_state",
      kind: "enum",
      values: ["combat", "search", "none"],
      description: "Combat state the player just entered.",
    },
  ],
  TESDeathEvent: [
    {
      key: "victim",
      kind: "actor",
      values: ACTOR_STRINGS,
      description: "Who died.",
    },
    {
      key: "killer",
      kind: "actor",
      values: ACTOR_STRINGS,
      description: "Who landed the killing blow.",
    },
  ],
  TESEnterBleedoutEvent: [
    {
      key: "actor",
      kind: "actor",
      values: ["player"],
      description: "Always `player`.",
    },
  ],
  TESSpellCastEvent: [
    {
      key: "caster",
      kind: "actor",
      values: ["player"],
      description: "Always `player`.",
    },
  ],
  TESPlayerBowShotEvent: [
    {
      key: "shot_power",
      kind: "enum",
      values: ["full", "partial", "low"],
      description: "full ≥1.0, low ≤0.2, partial between.",
    },
    {
      key: "is_sun_gazing",
      kind: "boolString",
      values: ["true", "false"],
      description: "Whether the player is aiming near the sun.",
    },
    {
      key: "weapon",
      kind: "formRef",
      values: [],
      description: "Form reference of the bow used.",
    },
    {
      key: "ammo",
      kind: "formRef",
      values: [],
      description: "Form reference of the arrow type used.",
    },
  ],
  TESActorLocationChangeEvent: [
    {
      key: "actor",
      kind: "actor",
      values: ["player"],
      description: "Always `player`.",
    },
    {
      key: "old_location",
      kind: "formRef",
      values: [],
      description: "BGSLocation the player just left (may be unset).",
    },
    {
      key: "new_location",
      kind: "formRef",
      values: [],
      description: "BGSLocation the player just entered (may be unset).",
    },
  ],
  LevelUpEvent: [
    {
      key: "new_level",
      kind: "stringList",
      values: [],
      description:
        "Stringified integer level the player just reached (e.g. \"10\"). Omit to fire on every level-up.",
    },
  ],
  SkillIncreaseEvent: [
    {
      key: "skill",
      kind: "stringList",
      // 18 vanilla Skyrim skills — the plugin uses ActorValueInfo::enumName
      // at runtime, so these names are guaranteed for the base game. Skill
      // mods may add others; ChipInput flags unknown entries visually.
      values: [
        "OneHanded", "TwoHanded", "Archery", "Block", "Smithing",
        "HeavyArmor", "LightArmor", "Pickpocket", "Lockpicking", "Sneak",
        "Alchemy", "Speech", "Alteration", "Conjuration", "Destruction",
        "Illusion", "Restoration", "Enchanting",
      ],
      description:
        "Skill that just ranked up. Fires frequently — pair with cooldown_seconds or chance to avoid chatter.",
    },
  ],
  FallEvent: [
    {
      key: "after_seconds",
      kind: "numberList",
      values: [],
      description:
        "Airtime threshold in seconds (JSON number). Fires once per fall when crossed. Use an array to stack multiple thresholds on one line.",
    },
  ],
  AnimationEvent: [
    {
      key: "tag",
      kind: "stringList",
      values: [],
      description:
        "Animation tag string (e.g. JumpUp, attackStart). Strongly recommended — without it, every animation tag on the player's graph triggers the line.",
    },
    {
      key: "payload",
      kind: "stringList",
      values: [],
      description:
        "Tag-specific extra data. Often empty; leave unset unless you know the tag emits a payload.",
    },
  ],
  periodic: [],
};

// ---------- Conditions ----------

export const CONDITION_TYPES = [
  "ActorValue",
  "IsInCombat",
  "IsWeaponDrawn",
  "IsSneaking",
  "IsSleeping",
  "IsInterior",
  "IsSwimming",
  "IsFemale",
  "IsRace",
  "HasActiveEffect",
  "HasPerk",
  "HasSpell",
  "IsSlotEmpty",
  "LocationHasKeyword",
  "PlayerName",
  "NPCsNearby",
  "IsLocation",
  "IsRunning",
  "IsSprinting",
  "IsWalking",
  "IsBlocking",
  "IsBleedingOut",
  "IsOnMount",
  "IsFlying",
  "IsTrespassing",
  "PlayerLevel",
  "GoldAmount",
  "TimeOfDay",
  "IsInFaction",
  "IsInWorldspace",
  "WeatherIs",
  "IsCurrentWeather",
  "QuestStage",
  "QuestState",
  "EquippedWeaponType",
  "ConditionGroup",
] as const;

export type ConditionType = (typeof CONDITION_TYPES)[number];

export const ACTOR_VALUE_COMPARISONS = [
  "below",
  "above",
  "equals",
  "notEquals",
  "greaterOrEqual",
  "lessOrEqual",
  "percentBelow",
  "percentAbove",
  "percentEquals",
  "percentNotEquals",
  "percentGreaterOrEqual",
  "percentLessOrEqual",
] as const;

export type ActorValueComparison = (typeof ACTOR_VALUE_COMPARISONS)[number];

// ---------- Simple comparisons (NPCsNearby) ----------

/**
 * Non-percent subset of CompareOp. NPCsNearby compares raw integer counts,
 * so percent operators have no meaning. Named forms match the plugin's
 * ParseCompareOp named branch; the editor normalises symbolic (">=") to
 * named ("greaterOrEqual") on save.
 */
export const SIMPLE_COMPARISONS = [
  "below",
  "above",
  "equals",
  "notEquals",
  "greaterOrEqual",
  "lessOrEqual",
] as const;

export type SimpleComparison = (typeof SIMPLE_COMPARISONS)[number];

// ---------- Weather kinds (WeatherIs) ----------

export const WEATHER_KINDS = ["raining", "snowing"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

// ---------- Quest states (QuestState) ----------

export const QUEST_STATES = ["running", "completed", "stopped"] as const;
export type QuestState = (typeof QUEST_STATES)[number];

// ---------- Weapon kinds (EquippedWeaponType) ----------

export const WEAPON_KINDS = [
  "unarmed", "sword", "dagger", "waraxe", "mace",
  "greatsword", "battleaxe", "bow", "crossbow", "staff",
] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];

export const WEAPON_HANDS = ["right", "left"] as const;
export type WeaponHand = (typeof WEAPON_HANDS)[number];

export const CONDITION_GROUP_LOGICS = ["AND", "OR"] as const;

export type ConditionGroupLogic = (typeof CONDITION_GROUP_LOGICS)[number];

// ---------- Armor slots (IsSlotEmpty) ----------

export const ARMOR_SLOTS = [
  "head",
  "hair",
  "body",
  "hands",
  "amulet",
  "ring",
  "feet",
  "shield",
  "circlet",
] as const;

export type ArmorSlot = (typeof ARMOR_SLOTS)[number];

// ---------- Actor value names (curated for autocomplete) ----------

/**
 * Skyrim's most commonly-queried actor values. The plugin resolves names via
 * ActorValueList::LookupActorValueByName, so any string Skyrim accepts will
 * work — this list is for autocomplete convenience only.
 */
export const COMMON_ACTOR_VALUES = [
  "Health",
  "Magicka",
  "Stamina",
  "HealRate",
  "MagickaRate",
  "StaminaRate",
  "HealRateMult",
  "MagickaRateMult",
  "StaminaRateMult",
  "CarryWeight",
  "CritChance",
  "MeleeDamage",
  "UnarmedDamage",
  "Mass",
  "Paralysis",
  "Invisibility",
  "NightEye",
  "DetectLifeRange",
  "WaterBreathing",
  "WaterWalking",
  "IgnoreCrippledLimbs",
  "OneHanded",
  "TwoHanded",
  "Archery",
  "Block",
  "Smithing",
  "HeavyArmor",
  "LightArmor",
  "Pickpocket",
  "LockPicking",
  "Sneak",
  "Alchemy",
  "Speech",
  "Alteration",
  "Conjuration",
  "Destruction",
  "Illusion",
  "Restoration",
  "Enchanting",
] as const;

// ---------- Common animation tags (AnimationEvent) ----------

/**
 * Verified jump-related animation tags from EVENTS.md. Every install emits
 * many more (attacks, blocks, footsteps, etc.) — see the "Discovering other
 * tags" procedure in EVENTS.md to find install-specific ones via trace logs.
 */
export const COMMON_ANIMATION_TAGS = [
  "JumpUp",
  "JumpDown",
  "JumpLand",
  "JumpDirectionalStart",
  "JumpLandDirectional",
] as const;

// ---------- Common race editor IDs (IsRace autocomplete) ----------

/**
 * Vanilla Skyrim playable race editor IDs. The plugin resolves via
 * TESRace lookup, so modded races work too — this list is for
 * autocomplete convenience only.
 */
export const COMMON_RACE_EDITOR_IDS = [
  "NordRace",
  "ImperialRace",
  "BretonRace",
  "RedguardRace",
  "HighElfRace",
  "WoodElfRace",
  "DarkElfRace",
  "OrcRace",
  "KhajiitRace",
  "ArgonianRace",
] as const;

// ---------- Common location keywords ----------

/**
 * BGSLocation keywords Skyrim uses on vanilla locations. The plugin queries
 * via HasKeywordString so any string works — this list is autocomplete only.
 */
export const COMMON_LOCATION_KEYWORDS = [
  "LocTypeCity",
  "LocTypeTown",
  "LocTypeSettlement",
  "LocTypeInn",
  "LocTypeStore",
  "LocTypeTemple",
  "LocTypePlayerHouse",
  "LocTypeDwelling",
  "LocTypeHabitation",
  "LocTypeDungeon",
  "LocTypeDraugrCrypt",
  "LocTypeDwarvenRuin",
  "LocTypeFalmerHive",
  "LocTypeBanditCamp",
  "LocTypeForswornCamp",
  "LocTypeVampireLair",
  "LocTypeWerewolfLair",
  "LocTypeAnimalDen",
  "LocTypeClearable",
  "LocTypeHold",
  "LocTypeHoldCapital",
  "LocTypeMilitaryFort",
  "LocTypeCastle",
  "LocTypeGuild",
  "LocTypeBarracks",
  "LocTypeJail",
  "LocTypeMine",
  "LocTypeFarm",
  "LocTypeMill",
  "LocTypeShip",
  "LocTypeShipwreck",
  "LocTypeCave",
] as const;

// ---------- Common location editor IDs (IsLocation autocomplete) ----------

/**
 * Vanilla Skyrim BGSLocation editor IDs. The plugin resolves via
 * GetFormEditorID and traverses the parent-location chain, so matching
 * a hold covers all child locations. Modded locations work too —
 * this list is for autocomplete convenience only.
 */
export const COMMON_LOCATION_EDITOR_IDS = [
  "WhiterunLocation",
  "SolitudeLocation",
  "WindhelmLocation",
  "RiftenLocation",
  "MarkarthLocation",
  "FalkreathLocation",
  "MorthalLocation",
  "DawnstarLocation",
  "WinterholdLocation",
  "WhiterunHoldLocation",
  "HaafingarHoldLocation",
  "EastmarchHoldLocation",
  "TheReachHoldLocation",
  "TheRiftHoldLocation",
  "ThePaleHoldLocation",
  "FalkreathHoldLocation",
  "HjaalmarchHoldLocation",
  "WinterholdHoldLocation",
  "RiverwoodLocation",
  "HelgenLocation",
  "IvarsteadLocation",
  "SovngardeLocation",
  "SolstheimLocation",
] as const;

// ---------- Common magic-effect keywords ----------

/**
 * Vanilla Skyrim MagicEffect keywords. Used by HasActiveEffect condition.
 */
export const COMMON_MAGIC_EFFECT_KEYWORDS = [
  "MagicDamageFire",
  "MagicDamageFrost",
  "MagicDamageShock",
  "MagicDamagePoison",
  "MagicDamageHealth",
  "MagicDamageMagicka",
  "MagicDamageStamina",
  "MagicRestoreHealth",
  "MagicRestoreMagicka",
  "MagicRestoreStamina",
  "MagicInvisibility",
  "MagicNightEye",
  "MagicParalysis",
  "MagicSlow",
  "MagicTurnUndead",
  "MagicCloak",
  "MagicSoulTrap",
  "MagicFrenzy",
  "MagicCalm",
  "MagicFear",
  "MagicWard",
  "MagicArmorSpell",
  "MagicWaterBreathing",
  "MagicFortifySkill",
  "MagicSummonCreature",
  "MagicSummonUndead",
  "MagicInfluenceCharm",
  "MagicInfluenceFrenzy",
  "MagicInfluenceFear",
] as const;

// ---------- JSON field ordering (for stable serialization) ----------

/**
 * Canonical field order emitted by json-io.serialize. Unknown fields are
 * appended alphabetically after the known set to preserve forward-compat.
 */
export const CANONICAL_FIELD_ORDER = [
  // Discriminated-union tag: always leads its containing object.
  "type",
  // Universal condition flags (right after type on every condition).
  "negated",
  "disabled",
  "reference",
  // VoiceLine top-level fields.
  "event",
  "speaker",
  "event_filter",
  "subtitle",            // nested { text, duration_ms }
  "chance",
  "cooldown_seconds",
  "exclusive",
  "important",
  "play_once",
  "lipsync",             // nested { enabled, intensity }
  "suppress_subtypes",
  "clips",             // multi-clip array
  // Per-clip / subtitle subfields (applied inside clip and subtitle objects).
  "wav",
  "text",
  "duration_ms",
  // Lipsync subfields (applied inside the `lipsync` object).
  "enabled",
  "intensity",
  // Condition-specific fields (applied inside each condition object).
  "logic",         // ConditionGroup
  "value",         // ActorValue
  "comparison",    // ActorValue
  "threshold",     // ActorValue
  "keyword",       // HasActiveEffect / LocationHasKeyword
  "formID",        // HasActiveEffect / IsRace / HasPerk / HasSpell
  "race",          // IsRace
  "name",          // PlayerName
  "slots",         // IsSlotEmpty
  "location",      // IsLocation
  "radius",        // NPCsNearby
  "count",         // NPCsNearby
  "kind",          // WeatherIs / EquippedWeaponType
  "hand",          // EquippedWeaponType
  "stage",         // QuestStage
  "state",         // QuestState
  "min",           // TimeOfDay
  "max",           // TimeOfDay
  // Recursive: VoiceLine.conditions AND ConditionGroup.conditions both end last.
  "conditions",
] as const;

// ---------- Helpers ----------

export function isKnownEvent(name: string): name is EventName {
  return (KNOWN_EVENTS as readonly string[]).includes(name);
}

export function isKnownConditionType(name: string): name is ConditionType {
  return (CONDITION_TYPES as readonly string[]).includes(name);
}

export function isKnownArmorSlot(name: string): name is ArmorSlot {
  return (ARMOR_SLOTS as readonly string[]).includes(name);
}

export function getFilterSpec(
  event: EventName,
  key: string,
): FilterKeySpec | undefined {
  return FILTER_KEYS_PER_EVENT[event].find((spec) => spec.key === key);
}

export function getAllowedFilterKeys(event: EventName): readonly string[] {
  return FILTER_KEYS_PER_EVENT[event].map((spec) => spec.key);
}
