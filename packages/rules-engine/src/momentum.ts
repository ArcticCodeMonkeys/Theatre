// ─── Momentum & Ruin Tracker ──────────────────────────────────────────────────

export interface MomentumState {
  pcMomentum: number;
  enemyMomentum: number;
  partySize: number;
  hasRuin: boolean;
  enemyHasRuin: boolean;
}

export function ruinThreshold(partySize: number): number {
  return 10 * partySize;
}

export function addPCMomentum(state: MomentumState, amount: number): MomentumState {
  const pcMomentum = state.pcMomentum + amount;
  const hasRuin = pcMomentum >= ruinThreshold(state.partySize);
  return { ...state, pcMomentum: hasRuin ? 0 : pcMomentum, hasRuin };
}

export function addEnemyMomentum(state: MomentumState, amount: number): MomentumState {
  const enemyMomentum = state.enemyMomentum + amount;
  const enemyHasRuin = enemyMomentum >= ruinThreshold(state.partySize);
  return { ...state, enemyMomentum: enemyHasRuin ? 0 : enemyMomentum, enemyHasRuin };
}

export function consumeRuin(state: MomentumState): MomentumState {
  return { ...state, hasRuin: false };
}

export function createMomentumState(partySize: number): MomentumState {
  return { pcMomentum: 0, enemyMomentum: 0, partySize, hasRuin: false, enemyHasRuin: false };
}
