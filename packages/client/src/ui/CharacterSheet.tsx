import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CharacterSheet as Sheet,
  DieFace, DIE_OPTIONS,
  SkillBonuses, Equipment,
  DEFAULT_SKILL_BONUSES, DEFAULT_EQUIPMENT,
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

interface Props {
  sheet: Sheet;
  onUpdate: (updated: Sheet) => void;
}

export function CharacterSheet({ sheet, onUpdate }: Props) {
  const [local, setLocal] = useState<Sheet>(sheet);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if sheet prop changes (e.g. after server response)
  useEffect(() => { setLocal(sheet); }, [sheet.id]);

  const skills: SkillBonuses = (() => {
    try { return { ...DEFAULT_SKILL_BONUSES, ...JSON.parse(local.skill_bonuses) }; }
    catch { return DEFAULT_SKILL_BONUSES; }
  })();

  const equipment: Equipment = (() => {
    try { return { ...DEFAULT_EQUIPMENT, ...JSON.parse(local.equipment) }; }
    catch { return DEFAULT_EQUIPMENT; }
  })();

  const persist = useCallback((next: Sheet) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const resp = await fetch(`${API}/api/sheets/${next.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        const saved = await resp.json();
        onUpdate(saved);
      } catch { /* silent */ }
    }, 600);
  }, [onUpdate]);

  const set = useCallback(<K extends keyof Sheet>(field: K, value: Sheet[K]) => {
    setLocal(prev => {
      const next = { ...prev, [field]: value };
      persist(next);
      return next;
    });
  }, [persist]);

  const setSkill = (skill: keyof SkillBonuses, value: number) => {
    const next = { ...skills, [skill]: value };
    set('skill_bonuses', JSON.stringify(next));
  };

  const setEquip = (slot: keyof Equipment, value: string) => {
    const next = { ...equipment, [slot]: value };
    set('equipment', JSON.stringify(next));
  };

  // ── Inputs ────────────────────────────────────────────────────────────────

  const NumInput = ({ value, onChange, min = 0, style = {} }: {
    value: number; onChange: (v: number) => void; min?: number; style?: React.CSSProperties;
  }) => (
    <input
      type="number"
      value={value}
      min={min}
      onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))}
      style={{ ...numInputStyle, ...style }}
    />
  );

  const DieSelect = ({ value, onChange }: { value: DieFace; onChange: (v: DieFace) => void }) => (
    <select value={value} onChange={e => onChange(Number(e.target.value) as DieFace)} style={dieSelectStyle}>
      {DIE_OPTIONS.map(d => (
        <option key={d} value={d}>{d === 1 ? 'd1' : `d${d}`}</option>
      ))}
    </select>
  );

  // ── Sections ──────────────────────────────────────────────────────────────

  const sectionHeader = (title: string) => (
    <div style={sectionLabelStyle}>{title}</div>
  );

  const divider = <div style={dividerStyle} />;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statsSection = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
      {(['MIG', 'DEX', 'WIL', 'PRE'] as const).map(stat => {
        const scoreKey = `${stat.toLowerCase()}_score` as keyof Sheet;
        const dieKey   = `${stat.toLowerCase()}_die` as keyof Sheet;
        const color    = STAT_COLORS[stat];
        return (
          <div key={stat} style={statCardStyle}>
            {/* Stat header */}
            <div style={{ background: color, borderRadius: '4px 4px 0 0', padding: '4px 0', textAlign: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>{stat}</span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{SAVE_LABELS[stat]}</span>
            </div>

            {/* Score + Die */}
            <div style={{ padding: '6px 6px 4px', display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={miniLabelStyle}>Score</div>
                <NumInput
                  value={local[scoreKey] as number}
                  onChange={v => set(scoreKey, v)}
                  style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700 }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={miniLabelStyle}>Die</div>
                <DieSelect
                  value={local[dieKey] as DieFace}
                  onChange={v => set(dieKey, v)}
                />
              </div>
            </div>

            {/* Skills */}
            <div style={{ padding: '0 6px 6px', borderTop: '1px solid #2a2a4a' }}>
              {STAT_SKILLS[stat].map(skill => (
                <div key={skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: '#999', fontSize: 10, flex: 1 }}>{skill}</span>
                  <NumInput
                    value={skills[skill] as number}
                    onChange={v => setSkill(skill, v)}
                    min={-5}
                    style={{ width: 34, textAlign: 'center', fontSize: 11 }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Health bars ───────────────────────────────────────────────────────────
  const healthSection = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
      {([
        ['HP', '#e74c3c', 'hp_current', 'hp_max', 'Physical damage'],
        ['Mental', '#3498db', 'mental_current', 'mental_max', 'Psychic / CC sacrifice'],
        ['Grave', '#9b59b6', 'grave_current', 'grave_max', 'Necrotic / Soul power'],
      ] as const).map(([label, color, curKey, maxKey, hint]) => {
        const cur = local[curKey as keyof Sheet] as number;
        const max = local[maxKey as keyof Sheet] as number;
        const pct = max > 0 ? Math.min(1, cur / max) : 0;
        return (
          <div key={label} style={healthCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</span>
              <span style={{ color: '#555', fontSize: 10 }}>{hint}</span>
            </div>
            {/* Track */}
            <div style={{ height: 6, background: '#1a1a2e', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.2s' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <NumInput value={cur} onChange={v => set(curKey as keyof Sheet, v)} style={{ width: 46, textAlign: 'center', fontSize: 16, fontWeight: 700, color }} />
              <span style={{ color: '#444', fontSize: 14 }}>/</span>
              <NumInput value={max} onChange={v => set(maxKey as keyof Sheet, v)} style={{ width: 46, textAlign: 'center', fontSize: 13 }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Combat resources ──────────────────────────────────────────────────────
  const Pips = ({ count, max, color, label, onChange }: {
    count: number; max: number; color: string; label: string; onChange: (v: number) => void;
  }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={miniLabelStyle}>{label}</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 2 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            onClick={() => onChange(i < count ? i : i + 1)}
            style={{
              width: 16, height: 16, borderRadius: '50%', cursor: 'pointer',
              background: i < count ? color : '#2a2a4a',
              border: `2px solid ${color}`,
              transition: 'background 0.1s',
            }}
          />
        ))}
      </div>
    </div>
  );

  const combatSection = (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', padding: '10px 12px', background: '#0f0f1e', borderRadius: 6 }}>
      <Pips count={local.ap_current} max={3} color="#f1c40f" label="AP" onChange={v => set('ap_current', v)} />
      <Pips count={local.reactions_current} max={3} color="#e67e22" label="Reactions" onChange={v => set('reactions_current', v)} />
      <div style={{ textAlign: 'center' }}>
        <div style={miniLabelStyle}>Mana</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <NumInput value={local.mana_current} onChange={v => set('mana_current', v)} style={{ width: 40, textAlign: 'center' }} />
          <span style={{ color: '#444' }}>/</span>
          <NumInput value={local.mana_max} onChange={v => set('mana_max', v)} style={{ width: 40, textAlign: 'center' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={miniLabelStyle}>Momentum</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <NumInput value={local.momentum} onChange={v => set('momentum', Math.min(v, 99))} style={{ width: 52, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#f1c40f' }} />
          <span style={{ color: '#555', fontSize: 11 }}>pts</span>
        </div>
      </div>
    </div>
  );

  // ── Equipment ─────────────────────────────────────────────────────────────
  const equipSlots: [keyof Equipment, string][] = [
    ['mainHand', '⚔ Main Hand'], ['offHand', '🛡 Off Hand'], ['armor', '🧥 Armor'],
    ['shield', '🔰 Shield'], ['boots', '👢 Boots'], ['ring1', '💍 Ring 1'], ['ring2', '💍 Ring 2'],
  ];

  const equipSection = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, marginBottom: 12 }}>
      {equipSlots.map(([slot, label]) => (
        <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#666', fontSize: 11, minWidth: 74, textAlign: 'right' }}>{label}</span>
          <input
            type="text"
            value={equipment[slot]}
            onChange={e => setEquip(slot, e.target.value)}
            style={textInputStyle}
            placeholder="—"
          />
        </div>
      ))}
    </div>
  );

  // ── Conditions ────────────────────────────────────────────────────────────
  const activeConditions: string[] = (() => {
    try { return JSON.parse(local.conditions) as string[]; } catch { return []; }
  })();

  const conditionSection = activeConditions.length > 0 ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {activeConditions.map((c, i) => (
        <span key={i} style={conditionPillStyle}>
          {c}
          <button
            style={{ marginLeft: 4, background: 'none', border: 'none', color: '#f38ba8', cursor: 'pointer', padding: 0 }}
            onClick={() => {
              const next = activeConditions.filter((_, j) => j !== i);
              set('conditions', JSON.stringify(next));
            }}
          >×</button>
        </span>
      ))}
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={sheetStyle}>
      {/* ── Header ── */}
      <div style={headerStyle}>
        <input
          type="text"
          value={local.name}
          onChange={e => set('name', e.target.value)}
          style={nameInputStyle}
          placeholder="Character Name"
        />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
          {([
            ['Race', 'race'],
            ['Background', 'background'],
          ] as const).map(([label, field]) => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
              <input
                type="text"
                value={local[field]}
                onChange={e => set(field, e.target.value)}
                style={{ ...textInputStyle, width: 110 }}
                placeholder="—"
              />
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#888', fontSize: 11 }}>Level</span>
            <NumInput value={local.level} onChange={v => set('level', Math.max(1, v))} style={{ width: 40, textAlign: 'center' }} />
          </label>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Stats */}
        {sectionHeader('Stats')}
        {statsSection}

        {/* Health */}
        {sectionHeader('Health')}
        {healthSection}

        {/* Combat */}
        {sectionHeader('Combat')}
        {combatSection}

        {/* Saves reminder */}
        {divider}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {(['MIG', 'DEX', 'WIL', 'PRE'] as const).map(stat => (
            <div key={stat} style={{ textAlign: 'center', padding: '6px 4px', background: '#0f0f1e', borderRadius: 5, border: `1px solid ${STAT_COLORS[stat]}33` }}>
              <div style={{ color: STAT_COLORS[stat], fontWeight: 700, fontSize: 11 }}>{SAVE_LABELS[stat]}</div>
              <div style={{ color: '#666', fontSize: 10, marginTop: 1 }}>
                Roll {stat} die{local[`${stat.toLowerCase()}_die` as keyof Sheet] !== 1 ? ` (d${local[`${stat.toLowerCase()}_die` as keyof Sheet]})` : ' (1)'}
              </div>
            </div>
          ))}
        </div>

        {/* Conditions */}
        {activeConditions.length > 0 && sectionHeader('Conditions')}
        {conditionSection}

        {/* Equipment */}
        {sectionHeader('Equipment')}
        {equipSection}
        {divider}

        {/* Feats */}
        {sectionHeader('Feats & Features')}
        <textarea
          value={local.feats}
          onChange={e => set('feats', e.target.value)}
          placeholder="List feats and features here…"
          style={{ ...textareaStyle, height: 100 }}
        />
        {divider}

        {/* Notes */}
        {sectionHeader('Notes')}
        <textarea
          value={local.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Session notes, reminders, lore…"
          style={{ ...textareaStyle, height: 80 }}
        />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sheetStyle: React.CSSProperties = {
  background: '#12122a',
  color: '#cdd6f4',
  fontFamily: 'sans-serif',
  fontSize: 13,
  minWidth: 0,
};

const headerStyle: React.CSSProperties = {
  background: '#0a0a1a',
  borderBottom: '2px solid #2a2a4a',
  padding: '12px 14px',
};

const nameInputStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  borderBottom: '2px solid #7b8cde',
  color: '#e0e0ff',
  fontSize: 22,
  fontWeight: 700,
  width: '100%',
  outline: 'none',
  padding: '2px 0',
  letterSpacing: 1,
};

const sectionLabelStyle: React.CSSProperties = {
  color: '#7b8cde',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginBottom: 6,
  borderBottom: '1px solid #1e1e3a',
  paddingBottom: 3,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: '#1e1e3a',
  margin: '10px 0 12px',
};

const statCardStyle: React.CSSProperties = {
  background: '#0f0f1e',
  borderRadius: 6,
  border: '1px solid #2a2a4a',
  overflow: 'hidden',
};

const healthCardStyle: React.CSSProperties = {
  background: '#0f0f1e',
  borderRadius: 6,
  border: '1px solid #2a2a4a',
  padding: '8px 10px',
};

const miniLabelStyle: React.CSSProperties = {
  color: '#555',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 2,
};

const numInputStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a4a',
  borderRadius: 3,
  color: '#cdd6f4',
  padding: '2px 4px',
  width: 48,
  fontSize: 13,
  MozAppearance: 'textfield',
};

const dieSelectStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a4a',
  borderRadius: 3,
  color: '#cdd6f4',
  padding: '2px 4px',
  fontSize: 12,
  cursor: 'pointer',
  width: 52,
};

const textInputStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a4a',
  borderRadius: 3,
  color: '#cdd6f4',
  padding: '3px 6px',
  fontSize: 12,
  flex: 1,
  minWidth: 0,
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f0f1e',
  border: '1px solid #2a2a4a',
  borderRadius: 4,
  color: '#cdd6f4',
  padding: '8px',
  fontSize: 12,
  resize: 'none',
  outline: 'none',
  fontFamily: 'sans-serif',
  lineHeight: 1.5,
  boxSizing: 'border-box',
};

const conditionPillStyle: React.CSSProperties = {
  background: '#1e1e3a',
  border: '1px solid #f38ba8',
  borderRadius: 12,
  color: '#f38ba8',
  padding: '2px 8px',
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
};
