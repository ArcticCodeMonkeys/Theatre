// ─── Core Shared Types ────────────────────────────────────────────────────────

export type DieFace = 1 | 4 | 6 | 8 | 10 | 12;

export const DIE_ORDER: DieFace[] = [1, 4, 6, 8, 10, 12];

export type StatName = 'MIG' | 'DEX' | 'WIL' | 'PRE';

export type DamageType =
  | 'piercing' | 'slashing' | 'bludgeoning'
  | 'fire' | 'cold' | 'lightning' | 'thunder'
  | 'necrotic' | 'radiant' | 'psychic'
  | 'poison' | 'acid' | 'force';

export type AttackTag =
  | 'Binary' | 'Contested' | 'Melee' | 'Ranged' | 'Spell' | 'Weapon'
  | 'Physical' | 'NonPhysical';

export type ConditionName =
  | 'Blinded' | 'Burning' | 'Burnout' | 'Charmed' | 'Downed'
  | 'Grappled' | 'Hastened' | 'Hidden' | 'Incapacitated' | 'Injured'
  | 'Invisible' | 'Paralyzed' | 'Prone' | 'Restrained' | 'Shocked'
  | 'Slowed' | 'Stunned' | 'Exhaustion';

export type CheckType = 'Static' | 'Dynamic' | 'Contested';

export type DegreeOfSuccess = 'CriticalSuccess' | 'Success' | 'Failure' | 'CriticalFailure';

export type SaveType = 'Defend' | 'Avoid' | 'Resist' | 'Persist';

export interface StatEntry {
  score: number;    // flat bonus — used for Static Checks
  die: DieFace;     // rolled — used for Dynamic Checks and Saves
}

export interface HealthBar {
  current: number;
  max: number;
}

export interface DamageSource {
  diceCount: number;
  dieFace: DieFace;
  damageType: DamageType;
}

export interface ConditionEffect {
  name: ConditionName;
  severity?: number;
  durationDescription: string;
}

export interface AttackTemplate {
  id: string;
  name: string;
  tags: AttackTag[];
  damageSources: DamageSource[];
  conditions: ConditionEffect[];
  ruinEffect: string;
  rangeInFeet: number;
}

export interface ActiveCondition {
  name: ConditionName;
  severity?: number;      // present for stackable conditions
  turnsRemaining?: number;
  sourceId?: string;
}

export interface EquipmentSlots {
  armor?: string;
  shield?: string;
  boots?: string;
  ring1?: string;
  ring2?: string;
  mainHand?: string;
  offHand?: string;
  [key: string]: string | undefined;
}

export interface Creature {
  id: string;
  name: string;
  isPC: boolean;
  stats: Record<StatName, StatEntry>;
  health: {
    HP: HealthBar;
    Mental: HealthBar;
    Grave: HealthBar;
  };
  conditions: ActiveCondition[];
  equipment: EquipmentSlots;
  feats: string[];      // feat IDs, resolved against Compendium
  ap: number;           // current AP (max 3)
  reactions: number;    // current reactions (max 3)
  mana: number;
  maxMana: number;
}
