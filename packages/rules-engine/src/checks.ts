import { CheckType, DegreeOfSuccess, StatEntry } from './types';
import { rollDie } from './dice';

export interface CheckResult {
  type: CheckType;
  roll: number;
  dc: number;
  degree: DegreeOfSuccess;
  isCrit: boolean;
}

function degree(roll: number, dc: number): DegreeOfSuccess {
  if (roll >= dc + 5) return 'CriticalSuccess';
  if (roll >= dc)     return 'Success';
  if (roll <= dc - 5) return 'CriticalFailure';
  return 'Failure';
}

/** Static Check: stat.score + SB (skill bonus) vs DC */
export function staticCheck(stat: StatEntry, skillBonus: number, dc: number): CheckResult {
  const roll = stat.score + skillBonus;
  const deg = degree(roll, dc);
  return { type: 'Static', roll, dc, degree: deg, isCrit: deg === 'CriticalSuccess' || deg === 'CriticalFailure' };
}

/** Dynamic Check: roll stat.die + SB vs DC */
export function dynamicCheck(stat: StatEntry, skillBonus: number, dc: number): CheckResult {
  const { value } = rollDie(stat.die);
  const roll = value + skillBonus;
  const deg = degree(roll, dc);
  return { type: 'Dynamic', roll, dc, degree: deg, isCrit: deg === 'CriticalSuccess' || deg === 'CriticalFailure' };
}

/** Contested Check: both roll Dynamic, higher wins; ties go to the defender */
export function contestedCheck(
  attackerStat: StatEntry, attackerBonus: number,
  defenderStat: StatEntry, defenderBonus: number
): { attackerWins: boolean; attackerRoll: number; defenderRoll: number } {
  const a = rollDie(attackerStat.die).value + attackerBonus;
  const d = rollDie(defenderStat.die).value + defenderBonus;
  return { attackerWins: a > d, attackerRoll: a, defenderRoll: d };
}
