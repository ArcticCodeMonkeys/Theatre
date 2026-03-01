import { Creature } from './types';
import { addCondition } from './conditions';

export type RestType = 'Short' | 'Brief' | 'Long';

/** Brief Rest: regain HP = MIG score, Mental = WIL score, Grave = PRE score. Injured (-1). */
export function briefRest(creature: Creature): Creature {
  const updated = { ...creature };
  updated.health = {
    HP:     { ...creature.health.HP,     current: Math.min(creature.health.HP.max,     creature.health.HP.current     + creature.stats.MIG.score) },
    Mental: { ...creature.health.Mental, current: Math.min(creature.health.Mental.max, creature.health.Mental.current + creature.stats.WIL.score) },
    Grave:  { ...creature.health.Grave,  current: Math.min(creature.health.Grave.max,  creature.health.Grave.current  + creature.stats.PRE.score) },
  };
  // Reduce Injured severity by 1
  const injured = updated.conditions.find(c => c.name === 'Injured');
  if (injured && injured.severity !== undefined) {
    injured.severity = Math.max(0, injured.severity - 1);
    updated.conditions = updated.conditions.filter(c => c.name !== 'Injured' || (c.severity ?? 0) > 0);
  }
  return updated;
}

/** Long Rest: fully restore all health bars. Injured (-2). */
export function longRest(creature: Creature): Creature {
  const updated = { ...creature };
  updated.health = {
    HP:     { ...creature.health.HP,     current: creature.health.HP.max },
    Mental: { ...creature.health.Mental, current: creature.health.Mental.max },
    Grave:  { ...creature.health.Grave,  current: creature.health.Grave.max },
  };
  const injured = updated.conditions.find(c => c.name === 'Injured');
  if (injured && injured.severity !== undefined) {
    injured.severity = Math.max(0, injured.severity - 2);
    updated.conditions = updated.conditions.filter(c => c.name !== 'Injured' || (c.severity ?? 0) > 0);
  }
  return updated;
}

/** Called when a rest is interrupted by combat — grant Exhaustion(1). */
export function interruptedRest(creature: Creature): Creature {
  return addCondition(creature, { name: 'Exhaustion', severity: 1 });
}
