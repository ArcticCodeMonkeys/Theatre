import React, { useState } from 'react';
import { CharacterSheet, ActiveCondition, SaveLevels, DEFAULT_SAVE_LEVELS, DieFace } from '../types/sheets';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RollSummary {
  expression: string;
  type: string;
  total: number;
}

export interface ReactionPromptData {
  attackName: string;
  attackerName: string;
  rolls: RollSummary[];
  totalDmg: number;
  conditionsToApply: ActiveCondition[];
  /** Stat keys the attack offers as save options, e.g. ['DEX', 'WIL'] */
  saves: string[];
  target: CharacterSheet;
}

export interface ReactionOutcome {
  /** Which stat was used for the save, or null if skipped */
  savedWith: string | null;
  /** Die roll + bonus total (0 if skipped) */
  roll: number;
  /** Damage remaining after save (same as totalDmg if skipped) */
  remainingDmg: number;
}

interface Props {
  prompt: ReactionPromptData;
  onResolve: (outcome: ReactionOutcome) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAT_DIE: Record<string, keyof CharacterSheet> = {
  MIG: 'mig_die', DEX: 'dex_die', WIL: 'wil_die', PRE: 'pre_die',
};

const STAT_LABEL: Record<string, string> = {
  MIG: 'Might', DEX: 'Dexterity', WIL: 'Will', PRE: 'Presence',
};

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReactionModal({ prompt, onResolve }: Props) {
  const { attackName, attackerName, rolls, totalDmg, conditionsToApply, saves, target } = prompt;

  const [rolled, setRolled] = useState<{
    stat: string; die: number; bonus: number; dieRoll: number; total: number; remaining: number;
  } | null>(null);

  const pb = 1 + Math.ceil(target.level / 3);
  const saveLevels: SaveLevels = (() => {
    try { return { ...DEFAULT_SAVE_LEVELS, ...JSON.parse(target.save_levels) }; } catch { return { ...DEFAULT_SAVE_LEVELS }; }
  })();

  const handleReact = (stat: string) => {
    const die = target[STAT_DIE[stat] as keyof CharacterSheet] as DieFace;
    const tier = saveLevels[stat as keyof SaveLevels] ?? 0;
    const bonus = tier * pb;
    const dieRoll = rollDie(die);
    const total = dieRoll + bonus;
    const remaining = Math.max(0, totalDmg - total);
    setRolled({ stat, die, bonus, dieRoll, total, remaining });
  };

  const handleConfirm = () => {
    if (!rolled) return;
    onResolve({
      savedWith: rolled.stat,
      roll: rolled.total,
      remainingDmg: rolled.remaining,
    });
  };

  const handleSkip = () => {
    onResolve({ savedWith: null, roll: 0, remainingDmg: totalDmg });
  };

  return (
    // Full-screen dim backdrop — stops pointer events going to canvas below
    <div style={backdropStyle}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={headerStyle}>
          <span style={{ fontSize: 11, color: '#f38ba8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            ⚡ Reaction Triggered
          </span>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Attack info */}
          <div style={cardStyle}>
            <div style={cardLabelStyle}>Incoming Attack</div>
            <div style={{ color: '#cdd6f4', fontWeight: 700, fontSize: 14 }}>{attackName}</div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>by {attackerName}</div>
          </div>

          {/* Damage breakdown */}
          <div style={cardStyle}>
            <div style={cardLabelStyle}>Damage</div>
            {rolls.map((r, i) => (
              <div key={i} style={{ color: '#aaa', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>{r.expression} <span style={{ color: '#555' }}>[{r.type}]</span></span>
                <span style={{ color: '#f1c40f', fontWeight: 700 }}>{r.total}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #2a2a4a', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#aaa', fontSize: 12 }}>Total</span>
              <span style={{ color: '#f38ba8', fontSize: 16, fontWeight: 800 }}>{totalDmg}</span>
            </div>
          </div>

          {/* Conditions */}
          {conditionsToApply.length > 0 && (
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Conditions on Hit</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {conditionsToApply.map((c, i) => (
                  <span key={i} style={condPillStyle}>{c.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reaction result */}
          {rolled && (
            <div style={{ ...cardStyle, borderColor: rolled.remaining === 0 ? '#a6e3a1' : '#f9a825' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#cdd6f4', fontWeight: 700, fontSize: 13 }}>
                    {STAT_LABEL[rolled.stat]} Save
                  </div>
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    1d{rolled.die} ({rolled.dieRoll}) + {rolled.bonus} bonus = <strong style={{ color: '#cdd6f4' }}>{rolled.total}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {rolled.remaining === 0 ? (
                    <div style={{ color: '#a6e3a1', fontWeight: 800, fontSize: 14 }}>✓ Blocked!</div>
                  ) : (
                    <>
                      <div style={{ color: '#f9a825', fontWeight: 800, fontSize: 14 }}>{rolled.remaining} dmg</div>
                      <div style={{ color: '#666', fontSize: 11 }}>reduced from {totalDmg}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!rolled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#666', fontSize: 11, marginBottom: 2 }}>
                {target.name} can react with:
              </div>
              {saves.map(stat => {
                const die = target[STAT_DIE[stat] as keyof CharacterSheet] as DieFace;
                const tier = saveLevels[stat as keyof SaveLevels] ?? 0;
                const bonus = tier * pb;
                return (
                  <button key={stat} style={reactBtnStyle} onClick={() => handleReact(stat)}>
                    <span style={{ fontWeight: 700 }}>{STAT_LABEL[stat]} Save</span>
                    <span style={{ color: '#aaa', fontSize: 11 }}>
                      {' '}(1d{die}{bonus > 0 ? ` + ${bonus}` : ''})
                    </span>
                  </button>
                );
              })}
              <button style={skipBtnStyle} onClick={handleSkip}>
                Take full damage
              </button>
            </div>
          ) : (
            <button style={confirmBtnStyle} onClick={handleConfirm}>
              {rolled.remaining === 0 ? '✓ Confirm — No Damage' : `✓ Confirm — Take ${rolled.remaining} Damage`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.65)',
  zIndex: 10000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  background: '#12122a',
  border: '1px solid #f38ba850',
  borderRadius: 10,
  width: 340,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #2a2a4a',
  background: '#1a1a2e',
};

const cardStyle: React.CSSProperties = {
  background: '#0d0d1a',
  border: '1px solid #2a2a4a',
  borderRadius: 6,
  padding: '8px 10px',
};

const cardLabelStyle: React.CSSProperties = {
  color: '#7b8cde',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  marginBottom: 5,
};

const condPillStyle: React.CSSProperties = {
  background: '#2a1a2e',
  border: '1px solid #6a3a6a',
  borderRadius: 4,
  color: '#d89cde',
  fontSize: 11,
  padding: '2px 7px',
};

const reactBtnStyle: React.CSSProperties = {
  background: '#1a1a3a',
  border: '1px solid #5a5a9a',
  borderRadius: 6,
  color: '#cdd6f4',
  cursor: 'pointer',
  fontSize: 13,
  padding: '9px 12px',
  textAlign: 'left',
  transition: 'background 0.1s',
};

const skipBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #3a2a2a',
  borderRadius: 6,
  color: '#666',
  cursor: 'pointer',
  fontSize: 12,
  padding: '7px 12px',
  marginTop: 2,
};

const confirmBtnStyle: React.CSSProperties = {
  background: '#2a4a2a',
  border: '1px solid #4a8a4a',
  borderRadius: 6,
  color: '#a6e3a1',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  padding: '10px 12px',
  width: '100%',
};
