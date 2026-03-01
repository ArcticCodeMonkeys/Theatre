import { Creature, StatName } from './types';

export function createCreature(partial: Partial<Creature> & { id: string; name: string }): Creature {
  return {
    isPC: false,
    stats: {
      MIG: { score: 0, die: 6 },
      DEX: { score: 0, die: 6 },
      WIL: { score: 0, die: 6 },
      PRE: { score: 0, die: 6 },
    },
    health: {
      HP:      { current: 10, max: 10 },
      Mental:  { current: 10, max: 10 },
      Grave:   { current: 10, max: 10 },
    },
    conditions: [],
    equipment: {},
    feats: [],
    ap: 3,
    reactions: 3,
    mana: 0,
    maxMana: 0,
    ...partial,
  };
}

export function applyDamageToBar(
  creature: Creature,
  bar: 'HP' | 'Mental' | 'Grave',
  amount: number
): Creature {
  const updated = { ...creature };
  updated.health = { ...creature.health };
  updated.health[bar] = {
    ...creature.health[bar],
    current: Math.max(0, creature.health[bar].current - amount),
  };
  return updated;
}

export function refreshTurn(creature: Creature): Creature {
  return { ...creature, ap: 3, reactions: 3 };
}

export function spendAP(creature: Creature, amount = 1): Creature {
  if (creature.ap < amount) throw new Error(`Not enough AP`);
  return { ...creature, ap: creature.ap - amount };
}

export function spendReaction(creature: Creature): Creature {
  if (creature.reactions < 1) throw new Error(`No reactions left`);
  return { ...creature, reactions: creature.reactions - 1 };
}
