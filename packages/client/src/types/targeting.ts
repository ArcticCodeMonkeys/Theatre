import { AttackEntry, CharacterSheet } from './sheets';

export interface TilePos { col: number; row: number; }

export interface TargetingMode {
  attack: AttackEntry;
  attackerSheet: CharacterSheet;
  /** PlacedImage.id of the attacker's token on the canvas, or null if none placed. */
  attackerTokenId: string | null;
  /** Selected sheet IDs (Creature(s) attacks). */
  selectedSheetIds: number[];
  /** Confirmed AoE centre / cone endpoint. */
  aoeCell: TilePos | null;
  /** Current mouse tile (updated on mousemove for live AoE preview). */
  hoveredCell: TilePos | null;
  /** Non-blocking warning messages shown in the HUD. */
  warnings: string[];
}
