/**
 * Per-event presentation metadata — colours, descriptions, and "fires when"
 * text for tooltips + EventInfoSection cards.
 *
 * Colour CSS vars are defined in src/index.css under @theme. Tailwind v4
 * exposes them as `bg-event-{key}` utilities automatically.
 */

import type { EventName } from "./enums";

export interface EventMeta {
  /** Short human label used in headers. */
  label: string;
  /** Tailwind background class for badges. */
  bgClass: string;
  /** Tailwind text class for colored labels. */
  textClass: string;
  /** CSS var name (exposed to inline styles when needed). */
  cssVar: string;
  /** One-line description shown in tooltips. */
  summary: string;
  /** Multi-line description shown in the EventInfoSection card. */
  description: string;
}

export const EVENT_META: Record<EventName, EventMeta> = {
  TESHitEvent: {
    label: "Hit",
    bgClass: "bg-event-hit",
    textClass: "text-event-hit",
    cssVar: "--color-event-hit",
    summary: "Fires on every hit involving the player (either side).",
    description:
      "Dispatched when the player hits someone or gets hit themselves. " +
      "Filter by `target` or `aggressor` to distinguish which side the " +
      "player was on.",
  },
  TESCombatEvent: {
    label: "Combat",
    bgClass: "bg-event-combat",
    textClass: "text-event-combat",
    cssVar: "--color-event-combat",
    summary: "Fires when the player's combat state changes.",
    description:
      "Dispatched when the player enters combat, searches for hidden " +
      "enemies, or exits combat. NPC combat events are filtered out.",
  },
  TESDeathEvent: {
    label: "Death",
    bgClass: "bg-event-death",
    textClass: "text-event-death",
    cssVar: "--color-event-death",
    summary: "Fires when an actor dies and the player is involved.",
    description:
      "Dispatched on any death where the player is either the victim or " +
      "the killer. Filter by `victim` or `killer`.",
  },
  TESEnterBleedoutEvent: {
    label: "Bleedout",
    bgClass: "bg-event-bleedout",
    textClass: "text-event-bleedout",
    cssVar: "--color-event-bleedout",
    summary: "Fires when the player enters essential-actor bleedout.",
    description:
      "Dispatched only for the player. Uncommon — most player characters " +
      "die outright rather than bleed out.",
  },
  TESSpellCastEvent: {
    label: "Spell",
    bgClass: "bg-event-spell",
    textClass: "text-event-spell",
    cssVar: "--color-event-spell",
    summary: "Fires when the player casts a spell.",
    description:
      "Dispatched on every spell cast by the player. The specific spell " +
      "is not currently filterable — conditions must gate by caster state.",
  },
  TESPlayerBowShotEvent: {
    label: "Bow",
    bgClass: "bg-event-bow",
    textClass: "text-event-bow",
    cssVar: "--color-event-bow",
    summary: "Fires when the player releases a bow shot.",
    description:
      "Dispatched on arrow release. Filter by `shot_power`, `is_sun_gazing`, " +
      "or form-refs on `weapon` / `ammo` to target specific gear.",
  },
  TESActorLocationChangeEvent: {
    label: "Location",
    bgClass: "bg-event-location",
    textClass: "text-event-location",
    cssVar: "--color-event-location",
    summary: "Fires when the player enters a new BGSLocation.",
    description:
      "Dispatched on location transitions (entering a city, dungeon, inn, " +
      "etc.). Filter by `new_location` form-ref or use LocationHasKeyword " +
      "conditions for category matches.",
  },
  LevelUpEvent: {
    label: "Level",
    bgClass: "bg-event-level",
    textClass: "text-event-level",
    cssVar: "--color-event-level",
    summary: "Fires when the player's character level increases.",
    description:
      "Dispatched on level-up (sleep or level-up menu confirmation). " +
      "Filter by `new_level` for milestone lines, or omit the filter to " +
      "fire every level.",
  },
  SkillIncreaseEvent: {
    label: "Skill",
    bgClass: "bg-event-skill",
    textClass: "text-event-skill",
    cssVar: "--color-event-skill",
    summary: "Fires each time one of the player's skills ranks up.",
    description:
      "Dispatched on every skill rank-up (e.g. OneHanded 23 → 24). Very " +
      "chatty during active play — pair with cooldown_seconds or a " +
      "chance under 1 to keep the voice pack from steamrolling.",
  },
  FallEvent: {
    label: "Fall",
    bgClass: "bg-event-fall",
    textClass: "text-event-fall",
    cssVar: "--color-event-fall",
    summary: "Fires mid-fall once airtime crosses a configured threshold.",
    description:
      "Synthetic event driven by a per-frame watchdog wired to the player's " +
      "animation graph. Timer starts at apex (JumpDown) and ends on land. " +
      "Use `after_seconds` to pick the threshold; use an array for multiple " +
      "thresholds per line.",
  },
  AnimationEvent: {
    label: "Anim",
    bgClass: "bg-event-animation",
    textClass: "text-event-animation",
    cssVar: "--color-event-animation",
    summary: "Fires on every player animation-graph tag.",
    description:
      "Dispatched whenever the player's animation graph emits a tag " +
      "(JumpUp, attackStart, etc.). Always set `event_filter.tag` — " +
      "without it, every animation event the graph emits triggers this line.",
  },
  periodic: {
    label: "Periodic",
    bgClass: "bg-event-periodic",
    textClass: "text-event-periodic",
    cssVar: "--color-event-periodic",
    summary: "Polled at a fixed interval (default 5s).",
    description:
      "Synthetic event polled by PeriodicPoller. No filter fields — use " +
      "conditions (IsInCombat, IsSneaking, IsWeaponDrawn, etc.) to gate " +
      "by player state.",
  },
};

export function getEventMeta(event: EventName): EventMeta {
  return EVENT_META[event];
}
