import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CharacterSheet as Sheet,
  DieFace, DIE_OPTIONS,
  SkillBonuses, SkillLevels, SaveLevels, Equipment,
  ProficiencyTier, PROFICIENCY_TIERS,
  DEFAULT_SKILL_BONUSES, DEFAULT_SKILL_LEVELS, DEFAULT_SAVE_LEVELS, DEFAULT_EQUIPMENT,
} from '../types/sheets';

const API = 'http://localhost:3001';

const STAT_SKILLS: Record<string, (keyof SkillBonuses)[]> = {
  MIG: ['Climb', 'Push', 'Carry'],
  DEX: ['Stealth', 'Sleight of Hand', 'Acrobatics'],
  WIL: ['Spot', 'Medicine', 'Recall'],
  PRE: ['Influence', 'Arcana', 'Nature'],
};
const STAT_COLORS: Record<string, string> = {
  MIG: '#c0392b', DEX: '#2ecc71', WIL: '#3498db', PRE: '#9b59b6',
};
const SAVE_LABELS: Record<string, string> = {
  MIG: 'Defend', DEX: 'Avoid', WIL: 'Resist', PRE: 'Persist',
};
const EQUIP_SLOTS: [keyof Equipment, string][] = [
  ['mainHand', 'Main Hand'], ['offHand', 'Off Hand'],
  ['helmet', 'Helmet'], ['necklace', 'Necklace'],
  ['armor', 'Armor'], ['cape', 'Cape'],
  ['gloves', 'Gloves'], ['boots', 'Boots'],
  ['ring1', 'Ring 1'], ['ring2', 'Ring 2'],
];

// Sub-components MUST be outside the parent component to avoid remount on every render
interface NumInputProps { value: number; onChange: (v: number) => void; min?: number; style?: React.CSSProperties; }
function NumInput({ value, onChange, min = 0, style }: NumInputProps) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      onChange={e => { const n = parseInt(e.target.value, 10); onChange(isNaN(n) ? min : Math.max(min, n)); }}
      style={{ ...numInputStyle, ...style }}
    />
  );
}

interface DieSelectProps { value: DieFace; onChange: (v: DieFace) => void; }
function DieSelect({ value, onChange }: DieSelectProps) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value) as DieFace)} style={dieSelectStyle}>
      {DIE_OPTIONS.map(d => <option key={d} value={d}>{d === 1 ? 'd1' : `d${d}`}</option>)}
    </select>
  );
}

const TIER_SHORT = ['Untr.', 'App.', 'Skil.', 'Exp.', 'Mast.'];
interface TierSelectProps { value: ProficiencyTier; onChange: (v: ProficiencyTier) => void; color?: string; }
function TierSelect({ value, onChange, color }: TierSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value) as ProficiencyTier)}
      title={PROFICIENCY_TIERS[value]}
      style={{ ...tierSelectStyle, ...(color ? { borderColor: color + '70' } : {}) }}
    >
      {PROFICIENCY_TIERS.map((label, i) => (
        <option key={i} value={i}>{TIER_SHORT[i]}</option>
      ))}
    </select>
  );
}

interface PipsProps { count: number; max: number; color: string; label: string; onChange: (v: number) => void; }
function Pips({ count, max, color, label, onChange }: PipsProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={miniLabelStyle}>{label}</div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 4 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} onClick={() => onChange(i < count ? i : i + 1)}
            style={{ width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
              background: i < count ? color : '#2a2a4a', border: `2px solid ${color}`, transition: 'background 0.1s' }} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <div style={sectionLabelStyle}>{title}</div>;
}

interface Props { sheet: Sheet; onUpdate: (updated: Sheet) => void; }

export function CharacterSheet({ sheet, onUpdate }: Props) {
  const [local, setLocal] = useState<Sheet>(sheet);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(sheet); }, [sheet.id]);

  const persist = useCallback((next: Sheet) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const resp = await fetch(`${API}/api/sheets/${next.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          console.error('[CharacterSheet] PATCH failed', resp.status, err);
          return;
        }
        const saved = await resp.json();
        onUpdate(saved);
      } catch (e) {
        console.error('[CharacterSheet] persist error', e);
      }
    }, 600);
  }, [onUpdate]);

  const set = useCallback(<K extends keyof Sheet>(field: K, value: Sheet[K]) => {
    setLocal(prev => { const next = { ...prev, [field]: value }; persist(next); return next; });
  }, [persist]);

  const setSkill = useCallback((skill: keyof SkillBonuses, value: number) => {
    setLocal(prev => {
      const cur: SkillBonuses = (() => { try { return { ...DEFAULT_SKILL_BONUSES, ...JSON.parse(prev.skill_bonuses) }; } catch { return { ...DEFAULT_SKILL_BONUSES }; } })();
      const next = { ...prev, skill_bonuses: JSON.stringify({ ...cur, [skill]: value }) };
      persist(next); return next;
    });
  }, [persist]);

  const setSkillLevel = useCallback((skill: keyof SkillLevels, value: ProficiencyTier) => {
    setLocal(prev => {
      const prevPb = 1 + Math.ceil(prev.level / 3);
      const curLevels: SkillLevels = (() => { try { return { ...DEFAULT_SKILL_LEVELS, ...JSON.parse(prev.skill_levels) }; } catch { return { ...DEFAULT_SKILL_LEVELS }; } })();
      const curBonuses: SkillBonuses = (() => { try { return { ...DEFAULT_SKILL_BONUSES, ...JSON.parse(prev.skill_bonuses) }; } catch { return { ...DEFAULT_SKILL_BONUSES }; } })();
      const next = {
        ...prev,
        skill_levels: JSON.stringify({ ...curLevels, [skill]: value }),
        skill_bonuses: JSON.stringify({ ...curBonuses, [skill]: value * prevPb }),
      };
      persist(next); return next;
    });
  }, [persist]);

  const setSaveLevel = useCallback((stat: keyof SaveLevels, value: ProficiencyTier) => {
    setLocal(prev => {
      const cur: SaveLevels = (() => { try { return { ...DEFAULT_SAVE_LEVELS, ...JSON.parse(prev.save_levels) }; } catch { return { ...DEFAULT_SAVE_LEVELS }; } })();
      const next = { ...prev, save_levels: JSON.stringify({ ...cur, [stat]: value }) };
      persist(next); return next;
    });
  }, [persist]);

  const setEquip = useCallback((slot: keyof Equipment, value: string) => {
    setLocal(prev => {
      const cur: Equipment = (() => { try { return { ...DEFAULT_EQUIPMENT, ...JSON.parse(prev.equipment) }; } catch { return { ...DEFAULT_EQUIPMENT }; } })();
      const next = { ...prev, equipment: JSON.stringify({ ...cur, [slot]: value }) };
      persist(next); return next;
    });
  }, [persist]);

  const removeCondition = useCallback((i: number) => {
    setLocal(prev => {
      const list: string[] = (() => { try { return JSON.parse(prev.conditions); } catch { return []; } })();
      const next = { ...prev, conditions: JSON.stringify(list.filter((_, j) => j !== i)) };
      persist(next); return next;
    });
  }, [persist]);

  const skills: SkillBonuses = (() => { try { return { ...DEFAULT_SKILL_BONUSES, ...JSON.parse(local.skill_bonuses) }; } catch { return { ...DEFAULT_SKILL_BONUSES }; } })();
  const skillLevels: SkillLevels = (() => { try { return { ...DEFAULT_SKILL_LEVELS, ...JSON.parse(local.skill_levels) }; } catch { return { ...DEFAULT_SKILL_LEVELS }; } })();
  const saveLevels: SaveLevels = (() => { try { return { ...DEFAULT_SAVE_LEVELS, ...JSON.parse(local.save_levels) }; } catch { return { ...DEFAULT_SAVE_LEVELS }; } })();
  const equipment: Equipment  = (() => { try { return { ...DEFAULT_EQUIPMENT,       ...JSON.parse(local.equipment)       }; } catch { return { ...DEFAULT_EQUIPMENT };       } })();
  const activeConditions: string[] = (() => { try { return JSON.parse(local.conditions) as string[]; } catch { return []; } })();
  const pb = 1 + Math.ceil(local.level / 3);

  return (
    <div style={sheetStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <input type="text" value={local.name} onChange={e => set('name', e.target.value)}
          style={nameInputStyle} placeholder="Character Name" />
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
          {(['character_class', 'race', 'background'] as const).map(field => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={headerFieldLabelStyle}>{field === 'character_class' ? 'Class' : field.charAt(0).toUpperCase() + field.slice(1)}</span>
              <input type="text" value={local[field]} onChange={e => set(field, e.target.value)}
                style={{ ...textInputStyle, width: 120, fontSize: 14 }} placeholder="—" />
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={headerFieldLabelStyle}>Level</span>
            <NumInput value={local.level} onChange={v => set('level', Math.max(1, v))} style={{ width: 52, textAlign: 'center', fontSize: 16, fontWeight: 700 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={headerFieldLabelStyle}>PB</span>
            <div style={{ width: 52, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#7b8cde', background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, padding: '4px 4px' }}>
              +{pb}
            </div>
          </label>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* Stats */}
        <SectionHeader title="Stats" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {(['MIG', 'DEX', 'WIL', 'PRE'] as const).map(stat => {
            const scoreKey = `${stat.toLowerCase()}_score` as keyof Sheet;
            const dieKey   = `${stat.toLowerCase()}_die`   as keyof Sheet;
            const color    = STAT_COLORS[stat];
            return (
              <div key={stat} style={statCardStyle}>
                <div style={{ background: color, borderRadius: '5px 5px 0 0', padding: '5px 0 3px', textAlign: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: 2 }}>{stat}</span>
                  <br />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{SAVE_LABELS[stat]}</span>
                </div>
                <div style={{ padding: '8px 6px 6px', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={miniLabelStyle}>Score</div>
                    <NumInput value={local[scoreKey] as number} onChange={v => set(scoreKey, v)} style={{ width: 44, textAlign: 'center', fontSize: 18, fontWeight: 700 }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={miniLabelStyle}>Die</div>
                    <DieSelect value={local[dieKey] as DieFace} onChange={v => set(dieKey, v)} />
                  </div>
                </div>
                <div style={{ padding: '0 8px 8px', borderTop: '1px solid #2a2a4a' }}>
                  {/* Save row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 4px', borderBottom: '1px solid #2a2a4a1a', marginBottom: 2 }}>
                    <span style={{ color: color, fontSize: 12, fontWeight: 700, flex: 1 }}>{SAVE_LABELS[stat]}</span>
                    <TierSelect value={saveLevels[stat] as ProficiencyTier} onChange={v => setSaveLevel(stat, v)} color={color} />
                  </div>
                  {STAT_SKILLS[stat].map(skill => (
                    <div key={skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ color: '#aaa', fontSize: 12, flex: 1 }}>{skill}</span>
                      <TierSelect value={skillLevels[skill] as ProficiencyTier} onChange={v => setSkillLevel(skill, v)} />
                      <NumInput value={skills[skill] as number} onChange={v => setSkill(skill, v)} min={-5} style={{ width: 40, textAlign: 'center', fontSize: 13, marginLeft: 4 }} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Health */}
        <SectionHeader title="Health" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {(['HP', 'Mental', 'Grave'] as const).map(label => {
            const curKey = `${label.toLowerCase()}_current` as keyof Sheet;
            const maxKey = `${label.toLowerCase()}_max`     as keyof Sheet;
            const color  = label === 'HP' ? '#e74c3c' : label === 'Mental' ? '#3498db' : '#9b59b6';
            const cur = local[curKey] as number;
            const max = local[maxKey] as number;
            const pct = max > 0 ? Math.min(1, cur / max) : 0;
            return (
              <div key={label} style={healthCardStyle}>
                <span style={{ color, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 6 }}>{label}</span>
                <div style={{ height: 6, background: '#1a1a2e', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.2s' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <NumInput value={cur} onChange={v => set(curKey, v)} style={{ width: 50, textAlign: 'center', fontSize: 18, fontWeight: 700, color }} />
                  <span style={{ color: '#444', fontSize: 18 }}>/</span>
                  <NumInput value={max} onChange={v => set(maxKey, v)} style={{ width: 50, textAlign: 'center', fontSize: 15 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Combat */}
        <SectionHeader title="Combat" />
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', padding: '12px 14px', background: '#0f0f1e', borderRadius: 6 }}>
          <Pips count={local.ap_current} max={3} color="#f1c40f" label="AP" onChange={v => set('ap_current', v)} />
          <Pips count={local.reactions_current} max={3} color="#e67e22" label="Reactions" onChange={v => set('reactions_current', v)} />
          <div style={{ textAlign: 'center' }}>
            <div style={miniLabelStyle}>Mana</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <NumInput value={local.mana_current} onChange={v => set('mana_current', v)} style={{ width: 46, textAlign: 'center', fontSize: 15 }} />
              <span style={{ color: '#444', fontSize: 15 }}>/</span>
              <NumInput value={local.mana_max} onChange={v => set('mana_max', v)} style={{ width: 46, textAlign: 'center', fontSize: 15 }} />
            </div>
          </div>
        </div>

        {/* Conditions */}
        {activeConditions.length > 0 && (
          <>
            <SectionHeader title="Conditions" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {activeConditions.map((c, i) => (
                <span key={i} style={conditionPillStyle}>
                  {c}
                  <button style={{ marginLeft: 5, background: 'none', border: 'none', color: '#f38ba8', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
                    onClick={() => removeCondition(i)}>x</button>
                </span>
              ))}
            </div>
          </>
        )}

        {/* Equipment */}
        <SectionHeader title="Equipment" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7, marginBottom: 14 }}>
          {EQUIP_SLOTS.map(([slot, label]) => (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: '#777', fontSize: 12, minWidth: 80, textAlign: 'right', flexShrink: 0 }}>{label}</span>
              <input type="text" value={equipment[slot]} onChange={e => setEquip(slot, e.target.value)}
                style={textInputStyle} placeholder="—" />
            </div>
          ))}
        </div>

        {/* Feats */}
        <SectionHeader title="Feats & Features" />
        <textarea value={local.feats} onChange={e => set('feats', e.target.value)}
          placeholder="List feats and features here..." style={{ ...textareaStyle, height: 120 }} />

      </div>
    </div>
  );
}

const sheetStyle: React.CSSProperties = { background: '#12122a', color: '#cdd6f4', fontFamily: 'sans-serif', fontSize: 14, minWidth: 0 };
const headerStyle: React.CSSProperties = { background: '#0a0a1a', borderBottom: '2px solid #2a2a4a', padding: '14px 16px' };
const nameInputStyle: React.CSSProperties = { background: 'none', border: 'none', borderBottom: '2px solid #7b8cde', color: '#e0e0ff', fontSize: 26, fontWeight: 700, width: '100%', outline: 'none', padding: '2px 0' };
const headerFieldLabelStyle: React.CSSProperties = { color: '#888', fontSize: 13 };
const sectionLabelStyle: React.CSSProperties = { color: '#7b8cde', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, borderBottom: '1px solid #1e1e3a', paddingBottom: 4 };
const statCardStyle: React.CSSProperties = { background: '#0f0f1e', borderRadius: 6, border: '1px solid #2a2a4a', overflow: 'hidden' };
const healthCardStyle: React.CSSProperties = { background: '#0f0f1e', borderRadius: 6, border: '1px solid #2a2a4a', padding: '10px 12px' };
export const miniLabelStyle: React.CSSProperties = { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 };
const numInputStyle: React.CSSProperties = { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, color: '#cdd6f4', padding: '3px 4px', width: 52, fontSize: 14, boxSizing: 'border-box' };
const dieSelectStyle: React.CSSProperties = { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, color: '#cdd6f4', padding: '3px 4px', fontSize: 13, cursor: 'pointer', width: 56, boxSizing: 'border-box' };
const tierSelectStyle: React.CSSProperties = { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, color: '#cdd6f4', padding: '2px 3px', fontSize: 11, cursor: 'pointer', width: 62, boxSizing: 'border-box' };
const textInputStyle: React.CSSProperties = { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, color: '#cdd6f4', padding: '4px 7px', fontSize: 13, flex: 1, minWidth: 0, outline: 'none', boxSizing: 'border-box' };
const textareaStyle: React.CSSProperties = { width: '100%', background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 5, color: '#cdd6f4', padding: '10px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'sans-serif', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 4 };
const conditionPillStyle: React.CSSProperties = { background: '#1e1e3a', border: '1px solid #f38ba8', borderRadius: 12, color: '#f38ba8', padding: '3px 10px', fontSize: 12, display: 'flex', alignItems: 'center' };
