import { ActiveCondition, ConditionName, Creature } from './types';

const STACKABLE: Set<ConditionName> = new Set([
  'Burning', 'Burnout', 'Injured', 'Exhaustion', 'Shocked',
]);

export function isStackable(name: ConditionName): boolean {
  return STACKABLE.has(name);
}

/** Add or stack a condition on a creature. Returns the updated creature (immutable). */
export function addCondition(creature: Creature, incoming: ActiveCondition): Creature {
  const conditions = [...creature.conditions];

  if (isStackable(incoming.name)) {
    const existing = conditions.find(c => c.name === incoming.name);
    if (existing) {
      existing.severity = (existing.severity ?? 0) + (incoming.severity ?? 1);
      return { ...creature, conditions };
    }
  }

  // Replace any existing instance of a non-stackable condition
  const filtered = conditions.filter(c => c.name !== incoming.name);
  return { ...creature, conditions: [...filtered, { ...incoming }] };
}

/** Tick all stackable conditions at end of creature's turn (X - 1, remove at 0). */
export function tickConditions(creature: Creature): Creature {
  const conditions = creature.conditions
    .map(c => {
      if (isStackable(c.name) && c.severity !== undefined) {
        return { ...c, severity: c.severity - 1 };
      }
      return c;
    })
    .filter(c => c.severity === undefined || c.severity > 0);
  return { ...creature, conditions };
}

export function removeCondition(creature: Creature, name: ConditionName): Creature {
  return { ...creature, conditions: creature.conditions.filter(c => c.name !== name) };
}

export function hasCondition(creature: Creature, name: ConditionName): boolean {
  return creature.conditions.some(c => c.name === name);
}
