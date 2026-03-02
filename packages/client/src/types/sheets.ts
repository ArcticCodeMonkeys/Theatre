export type DieFace = 1 | 4 | 6 | 8 | 10 | 12;
export const DIE_OPTIONS: DieFace[] = [1, 4, 6, 8, 10, 12];

export type ProficiencyTier = 0 | 1 | 2 | 3 | 4;
export const PROFICIENCY_TIERS = ['Untrained', 'Apprentice', 'Skilled', 'Expert', 'Master'] as const;

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

export interface SkillLevels {
  Climb: ProficiencyTier;
  Push: ProficiencyTier;
  Carry: ProficiencyTier;
  Stealth: ProficiencyTier;
  'Sleight of Hand': ProficiencyTier;
  Acrobatics: ProficiencyTier;
  Spot: ProficiencyTier;
  Medicine: ProficiencyTier;
  Recall: ProficiencyTier;
  Influence: ProficiencyTier;
  Arcana: ProficiencyTier;
  Nature: ProficiencyTier;
}

export interface SaveLevels {
  MIG: ProficiencyTier;
  DEX: ProficiencyTier;
  WIL: ProficiencyTier;
  PRE: ProficiencyTier;
}

export interface Equipment {
  mainHand: string;
  offHand: string;
  helmet: string;
  necklace: string;
  armor: string;
  cape: string;
  gloves: string;
  boots: string;
  ring1: string;
  ring2: string;
}

export interface CharacterSheet {
  id: number;
  name: string;
  character_class: string;
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
  skill_levels: string;  // JSON SkillLevels
  save_levels: string;   // JSON SaveLevels
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
  token_image: string | null; // JSON ImageRecord | null
  created_at: string;
}

export const DEFAULT_SKILL_BONUSES: SkillBonuses = {
  Climb: 0, Push: 0, Carry: 0,
  Stealth: 0, 'Sleight of Hand': 0, Acrobatics: 0,
  Spot: 0, Medicine: 0, Recall: 0,
  Influence: 0, Arcana: 0, Nature: 0,
};

export const DEFAULT_SKILL_LEVELS: SkillLevels = {
  Climb: 0, Push: 0, Carry: 0,
  Stealth: 0, 'Sleight of Hand': 0, Acrobatics: 0,
  Spot: 0, Medicine: 0, Recall: 0,
  Influence: 0, Arcana: 0, Nature: 0,
};

export const DEFAULT_SAVE_LEVELS: SaveLevels = {
  MIG: 0, DEX: 0, WIL: 0, PRE: 0,
};

export const DEFAULT_EQUIPMENT: Equipment = {
  mainHand: '', offHand: '',
  helmet: '', necklace: '', armor: '', cape: '',
  gloves: '', boots: '', ring1: '', ring2: '',
};

export function emptySheet(): Omit<CharacterSheet, 'id' | 'created_at'> {
  return {
    name: 'New Character',
    character_class: '',
    race: '', background: '', level: 1,
    mig_score: 0, mig_die: 6,
    dex_score: 0, dex_die: 6,
    wil_score: 0, wil_die: 6,
    pre_score: 0, pre_die: 6,
    skill_bonuses: JSON.stringify(DEFAULT_SKILL_BONUSES),
    skill_levels: JSON.stringify(DEFAULT_SKILL_LEVELS),
    save_levels: JSON.stringify(DEFAULT_SAVE_LEVELS),
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
    token_image: null,
  };
}
