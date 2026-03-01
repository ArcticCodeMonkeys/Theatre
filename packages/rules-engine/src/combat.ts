import { Creature } from './types';

// ─── Parties ──────────────────────────────────────────────────────────────────

export interface Party {
  id: string;
  name: string;
  creatureIds: string[];
  isPC: boolean;
  /** Creatures in the Surprised group start with Incapacitated(1) */
  group: 'Ready' | 'Surprised';
}

// ─── Combat State ─────────────────────────────────────────────────────────────

export type CombatPhase = 'R1' | 'R2' | 'S1' | 'S2';

export interface CombatState {
  parties: Party[];
  phase: CombatPhase;
  round: number;
  activeCreatureId: string | null;
}

const PHASE_ORDER: CombatPhase[] = ['R1', 'R2', 'S1', 'S2'];

export function nextPhase(current: CombatPhase): CombatPhase {
  const idx = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}

export function advancePhase(state: CombatState): CombatState {
  const next = nextPhase(state.phase);
  const round = next === 'R1' ? state.round + 1 : state.round;
  return { ...state, phase: next, round, activeCreatureId: null };
}

export function createCombatState(parties: Party[]): CombatState {
  return { parties, phase: 'R1', round: 1, activeCreatureId: null };
}
