import { Creature, SaveType } from './types';
import { rollDie } from './dice';

export interface ReactionResult {
  saveType: SaveType;
  roll: number;
  remainingDamage: number;
}

const SAVE_STAT: Record<SaveType, keyof Creature['stats']> = {
  Defend: 'MIG',
  Avoid:  'DEX',
  Resist: 'WIL',
  Persist: 'PRE',
};

export function makeReaction(
  creature: Creature,
  saveType: SaveType,
  incomingDamage: number,
  bonus = 0
): ReactionResult {
  const stat = creature.stats[SAVE_STAT[saveType]];
  const { value } = rollDie(stat.die);
  const roll = value + bonus;
  return {
    saveType,
    roll,
    remainingDamage: Math.max(0, incomingDamage - roll),
  };
}
