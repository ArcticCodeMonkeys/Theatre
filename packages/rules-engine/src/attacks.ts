import { AttackTemplate, DamageSource, DieFace } from './types';
import { rollPool, applyForce, applyGraze, DicePoolResult } from './dice';

export interface DamageRollResult {
  source: DamageSource;
  result: DicePoolResult;
}

export interface AttackRollResult {
  template: AttackTemplate;
  damageRolls: DamageRollResult[];
  totalDamagePerSource: { damageType: string; total: number }[];
  isBinary: boolean;
}

export function rollAttack(
  template: AttackTemplate,
  opts: { force?: boolean; graze?: boolean } = {}
): AttackRollResult {
  const damageRolls: DamageRollResult[] = template.damageSources.map(source => {
    let count = source.diceCount;
    if (opts.force) count = applyForce(count);
    if (opts.graze) count = applyGraze(count);
    return {
      source,
      result: rollPool(source.dieFace, count),
    };
  });

  const totalDamagePerSource = damageRolls.map(dr => ({
    damageType: dr.source.damageType,
    total: dr.result.total,
  }));

  return {
    template,
    damageRolls,
    totalDamagePerSource,
    isBinary: template.tags.includes('Binary'),
  };
}

/** Apply a save die roll against incoming damage, returns remaining damage */
export function applyReactionRoll(incomingDamage: number, saveDieRoll: number): number {
  return Math.max(0, incomingDamage - saveDieRoll);
}
