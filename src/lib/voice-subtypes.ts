/**
 * Common Skyrim DIALOGUE_DATA::Subtype IDs for the suppress_subtypes field.
 * Mirrors the plugin's default suppression set — see
 * VoiceUnbound/src/CombatSubtypes.cpp GetDefaultSuppressedSubtypes().
 *
 * Subtype IDs come from RE::DIALOGUE_DATA::Subtype (CommonLibSSE-NG
 * TESTopic.h:46-124). These are the ones a modder is realistically going
 * to want to gate per-line. The full enum has 120+ entries but most are
 * quest-specific or editor-only and irrelevant here.
 */

export type SubtypeGroup =
  | "attacks"
  | "state"
  | "transitions"
  | "casting"
  | "breath"
  | "movement";

export interface VoiceSubtype {
  id: number;
  name: string;
  group: SubtypeGroup;
  /** Short tooltip text. */
  hint?: string;
}

export const GROUP_LABELS: Record<SubtypeGroup, string> = {
  attacks: "Attacks",
  state: "Combat state",
  transitions: "Transitions",
  casting: "Casting",
  breath: "Breath & effort",
  movement: "Movement",
};

export const VOICE_SUBTYPES: VoiceSubtype[] = [
  // Attacks
  { id: 26, name: "Attack", group: "attacks", hint: "Generic attack grunt" },
  { id: 27, name: "PowerAttack", group: "attacks" },
  { id: 28, name: "Bash", group: "attacks" },
  { id: 29, name: "Hit", group: "attacks", hint: "Taking damage" },
  { id: 35, name: "Block", group: "attacks" },
  { id: 80, name: "SwingMeleeWeapon", group: "attacks" },
  { id: 81, name: "ShootBow", group: "attacks" },
  // Combat state
  { id: 30, name: "Flee", group: "state" },
  { id: 31, name: "Bleedout", group: "state" },
  { id: 32, name: "AvoidThreat", group: "state" },
  { id: 33, name: "Death", group: "state" },
  { id: 36, name: "Taunt", group: "state" },
  { id: 37, name: "AllyKilled", group: "state" },
  { id: 101, name: "CombatGrunt", group: "state" },
  // Transitions
  { id: 58, name: "AlertToCombat", group: "transitions" },
  { id: 59, name: "NormalToCombat", group: "transitions" },
  { id: 60, name: "AlertToNormal", group: "transitions" },
  { id: 61, name: "CombatToNormal", group: "transitions" },
  { id: 62, name: "CombatToLost", group: "transitions" },
  { id: 75, name: "ObserveCombat", group: "transitions" },
  // Casting
  { id: 91, name: "PlayerCastProjectileSpell", group: "casting" },
  { id: 92, name: "PlayerCastSelfSpell", group: "casting" },
  { id: 93, name: "PlayerShout", group: "casting" },
  // Breath & effort
  { id: 95, name: "EnterSprintBreath", group: "breath" },
  { id: 96, name: "EnterBowZoomBreath", group: "breath" },
  { id: 97, name: "ExitBowZoomBreath", group: "breath" },
  { id: 100, name: "OutOfBreath", group: "breath" },
  { id: 102, name: "LeaveWaterBreath", group: "breath" },
  // Movement
  { id: 83, name: "Jump", group: "movement" },
];

/** Name lookup keyed by id (for showing labels next to user chips later). */
export const SUBTYPE_NAME_BY_ID: Map<number, string> = new Map(
  VOICE_SUBTYPES.map((s) => [s.id, s.name]),
);
