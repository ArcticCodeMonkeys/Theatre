import { DieFace, DIE_ORDER } from './types';

// ─── Die Stepping ─────────────────────────────────────────────────────────────

export function dieHigher(die: DieFace, steps = 1): DieFace {
  const idx = DIE_ORDER.indexOf(die);
  return DIE_ORDER[Math.min(idx + steps, DIE_ORDER.length - 1)];
}

export function dieLower(die: DieFace, steps = 1): DieFace {
  const idx = DIE_ORDER.indexOf(die);
  return DIE_ORDER[Math.max(idx - steps, 0)];
}

// ─── Roll a single die ────────────────────────────────────────────────────────

export interface DieResult {
  face: DieFace;
  value: number;
  isMax: boolean;   // triggers Momentum for PCs
  isMin: boolean;   // triggers enemy Momentum
}

export function rollDie(face: DieFace): DieResult {
  if (face === 1) return { face, value: 1, isMax: false, isMin: false };
  const value = Math.floor(Math.random() * face) + 1;
  return { face, value, isMax: value === face, isMin: value === 1 };
}

// ─── Roll a pool of dice ──────────────────────────────────────────────────────

export interface DicePoolResult {
  rolls: DieResult[];
  total: number;
  maxCount: number;
  minCount: number;
}

export function rollPool(face: DieFace, count: number): DicePoolResult {
  const rolls = Array.from({ length: count }, () => rollDie(face));
  return {
    rolls,
    total: rolls.reduce((sum, r) => sum + r.value, 0),
    maxCount: rolls.filter(r => r.isMax).length,
    minCount: rolls.filter(r => r.isMin).length,
  };
}

// ─── Force / Graze (add/subtract a die from each source) ─────────────────────

export function applyForce(count: number): number {
  return count + 1;
}

export function applyGraze(count: number): number {
  return Math.max(0, count - 1);
}
