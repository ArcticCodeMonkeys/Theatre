export type DieFace = 1 | 4 | 6 | 8 | 10 | 12;
export const DIE_OPTIONS: DieFace[] = [1, 4, 6, 8, 10, 12];

export interface SkillBonuses {
  Climb: number;
  Push: number;
  Carry: number;
  Stealth: number;
  'Sleight of Hand': number;
  Acrobatics: number;
  Spot: number;
  Medicine: number;
  Recall: number;
  Influence: number;
  Arcana: number;
  Nature: number;
}

export interface Equipment {
  mainHand: string;
  offHand: string;
  armor: string;
  shield: string;
  boots: string;
  ring1: string;
  ring2: string;
}

export interface CharacterSheet {
  id: number;
  name: string;
  race: string;
  background: string;
  level: number;
  mig_score: number;
  mig_die: DieFace;
  dex_score: number;
  dex_die: DieFace;
  wil_score: number;
  wil_die: DieFace;
  pre_score: number;
  pre_die: DieFace;
  skill_bonuses: string; // JSON SkillBonuses
  hp_current: number;
  hp_max: number;
  mental_current: number;
  mental_max: number;
  grave_current: number;
  grave_max: number;
  ap_current: number;
  reactions_current: number;
  mana_current: number;
  mana_max: number;
  momentum: number;
  conditions: string; // JSON string[]
  equipment: string;  // JSON Equipment
  feats: string;
  attacks: string;    // JSON array
  notes: string;
  created_at: string;
}

export const DEFAULT_SKILL_BONUSES: SkillBonuses = {
  Climb: 0, Push: 0, Carry: 0,
  Stealth: 0, 'Sleight of Hand': 0, Acrobatics: 0,
  Spot: 0, Medicine: 0, Recall: 0,
  Influence: 0, Arcana: 0, Nature: 0,
};

export const DEFAULT_EQUIPMENT: Equipment = {
  mainHand: '', offHand: '', armor: '', shield: '', boots: '', ring1: '', ring2: '',
};

export function emptySheet(): Omit<CharacterSheet, 'id' | 'created_at'> {
  return {
    name: 'New Character',
    race: '', background: '', level: 1,
    mig_score: 0, mig_die: 6,
    dex_score: 0, dex_die: 6,
    wil_score: 0, wil_die: 6,
    pre_score: 0, pre_die: 6,
    skill_bonuses: JSON.stringify(DEFAULT_SKILL_BONUSES),
    hp_current: 0, hp_max: 10,
    mental_current: 0, mental_max: 10,
    grave_current: 0, grave_max: 10,
    ap_current: 3, reactions_current: 3,
    mana_current: 0, mana_max: 0,
    momentum: 0,
    conditions: '[]',
    equipment: JSON.stringify(DEFAULT_EQUIPMENT),
    feats: '',
    attacks: '[]',
    notes: '',
  };
}
