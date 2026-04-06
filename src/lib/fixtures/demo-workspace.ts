/**
 * Seed data for browser-mode dev + Playwright E2E. Mirrors the shape of a
 * real Voice Unbound workspace at Data/Sound/fx/VoiceUnbound/.
 */

import type { SeedWorkspace } from "../host/browser-host";

const ROOT = "/Data/Sound/fx/VoiceUnbound";

type JsonFile = { path: string; data: Record<string, unknown> };

const files: JsonFile[] = [
  // okw_combat/
  {
    path: `${ROOT}/okw_combat/okw_battlecry_01.json`,
    data: {
      event: "TESCombatEvent",
      event_filter: { actor: "player", new_state: "combat" },
      subtitle: { text: "You picked the wrong fight!", duration_ms: 2000 },
      chance: 1.0,
      cooldown_seconds: 60,
    },
  },
  {
    path: `${ROOT}/okw_combat/okw_battlecry_02.json`,
    data: {
      event: "TESCombatEvent",
      event_filter: { actor: "player", new_state: "combat" },
      subtitle: { text: "Come on then, let's do this!", duration_ms: 2500 },
      chance: 1.0,
      cooldown_seconds: 60,
      exclusive: true,
      conditions: [{ type: "IsWeaponDrawn" }],
    },
  },
  {
    path: `${ROOT}/okw_combat/okw_hurt_01.json`,
    data: {
      event: "TESHitEvent",
      event_filter: { target: "player" },
      subtitle: { text: "Argh... that one hurt...", duration_ms: 2500 },
      chance: 0.6,
      cooldown_seconds: 30,
      conditions: [
        {
          type: "ActorValue",
          value: "Health",
          comparison: "percentBelow",
          threshold: 0.5,
        },
      ],
    },
  },
  {
    path: `${ROOT}/okw_combat/okw_low_hp_01.json`,
    data: {
      event: "TESHitEvent",
      event_filter: { target: "player" },
      subtitle: { text: "I can't take much more of this...", duration_ms: 3000 },
      chance: 1.0,
      cooldown_seconds: 45,
      important: true,
      exclusive: true,
      conditions: [
        {
          type: "ActorValue",
          value: "Health",
          comparison: "percentBelow",
          threshold: 0.2,
        },
      ],
    },
  },
  {
    path: `${ROOT}/okw_combat/okw_taunt_01.json`,
    data: {
      event: "TESDeathEvent",
      event_filter: { killer: "player", victim: "npc" },
      subtitle: { text: "You should have stayed home.", duration_ms: 2500 },
      chance: 1.0,
      cooldown_seconds: 90,
      important: true,
      lipsync: { intensity: 1.4 },
    },
  },
  {
    path: `${ROOT}/okw_combat/okw_warcry_01.json`,
    data: {
      event: "TESHitEvent",
      event_filter: { aggressor: "player", target: "npc" },
      subtitle: { text: "Take that!", duration_ms: 1500 },
      chance: 0.5,
      cooldown_seconds: 15,
    },
  },

  // okw_idle/ (periodic event lines)
  {
    path: `${ROOT}/okw_idle/okw_whistle_01.json`,
    data: {
      event: "periodic",
      event_filter: { is_in_combat: "false", is_sneaking: "false" },
      subtitle: { text: "*whistles softly*", duration_ms: 2000 },
      chance: 0.3,
      cooldown_seconds: 120,
      lipsync: { enabled: false },
    },
  },
  {
    path: `${ROOT}/okw_idle/okw_cold_01.json`,
    data: {
      event: "periodic",
      event_filter: { is_in_combat: "false" },
      subtitle: { text: "Gods, this cold chills the bones.", duration_ms: 3000 },
      chance: 0.4,
      cooldown_seconds: 180,
      conditions: [
        { type: "LocationHasKeyword", keyword: "LocTypeDungeon" },
      ],
    },
  },

  // okw_stealth/
  {
    path: `${ROOT}/okw_stealth/okw_sneak_01.json`,
    data: {
      event: "periodic",
      event_filter: { is_sneaking: "true" },
      subtitle: { text: "Quiet now...", duration_ms: 1500 },
      chance: 0.5,
      cooldown_seconds: 60,
      conditions: [{ type: "IsSneaking" }],
    },
  },
];

export const DEMO_WORKSPACE: SeedWorkspace = {
  root: ROOT,
  files: files.map((f) => ({
    path: f.path,
    text: JSON.stringify(f.data, null, 2) + "\n",
  })),
  plugins: [
    "Skyrim.esm",
    "Update.esm",
    "Dawnguard.esm",
    "HearthFires.esm",
    "Dragonborn.esm",
    "Unofficial Skyrim Special Edition Patch.esp",
  ],
};
