import React from 'react';
import { TargetingMode } from '../types/targeting';
import { isAreaAttack } from '../renderer/targetingGeom';

interface Props {
  mode: TargetingMode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TargetingHUD({ mode, onConfirm, onCancel }: Props) {
  const { attack } = mode;
  const isArea = isAreaAttack(attack.target);
  const maxTargets = attack.target === 'Creature(s)' ? (attack.targetCount ?? 1) : null;
  const canConfirm = isArea ? mode.aoeCell !== null : mode.selectedSheetIds.length > 0;

  let status: string;
  if (isArea) {
    const aoeLabel = attack.target === 'Cone' ? 'endpoint' : 'centre';
    status = mode.aoeCell ? `${attack.target} ${aoeLabel} set — ready` : `Click to place ${attack.target} ${aoeLabel}`;
  } else {
    const sel = mode.selectedSheetIds.length;
    const max = maxTargets ?? '∞';
    status = `${sel} / ${max} target${sel !== 1 ? 's' : ''} selected`;
  }

  return (
    <div style={hudStyle}>
      {/* Attack identity + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          background: attack.attackType === 'Spell' ? '#6a3a9a' : '#7a2020',
          color: '#fff', fontWeight: 700, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: 1.2,
          borderRadius: 3, padding: '2px 7px', flexShrink: 0,
        }}>
          {attack.attackType}
        </span>
        <span style={{ color: '#cdd6f4', fontWeight: 700, fontSize: 14 }}>{attack.name}</span>
        <span style={{ color: '#7b8cde', fontSize: 12, background: '#1a1a3a', borderRadius: 4, padding: '2px 9px', border: '1px solid #2a2a5a' }}>
          {status}
        </span>
        <span style={{ color: '#3a3a6a', fontSize: 11 }}>
          Range {attack.rangeShort} / {attack.rangeLong} ft
          {attack.attackType === 'Spell' && attack.duration ? ` · ${attack.duration} round${attack.duration !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Keyboard hints */}
      <div style={{ color: '#3a3a5a', fontSize: 10, marginTop: 4, display: 'flex', gap: 8 }}>
        <span><Kbd>Enter</Kbd> confirm</span>
        <span><Kbd>Esc</Kbd> cancel</span>
        {!isArea && <span><Kbd>⌫</Kbd> deselect last</span>}
      </div>

      {/* Warnings */}
      {mode.warnings.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {mode.warnings.map((w, i) => (
            <span key={i} style={warningStyle}>⚠ {w}</span>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          style={canConfirm ? { ...btnBase, color: '#a6e3a1', borderColor: '#a6e3a140' } : { ...btnBase, color: '#333', borderColor: '#2a2a3a', cursor: 'default' }}
          onClick={canConfirm ? onConfirm : undefined}
          disabled={!canConfirm}
        >✓ Confirm</button>
        <button style={{ ...btnBase, color: '#f38ba8', borderColor: '#f38ba840' }} onClick={onCancel}>
          ✕ Cancel
        </button>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{ background: '#2a2a4a', border: '1px solid #3a3a6a', borderRadius: 3, padding: '1px 5px', fontSize: 10, color: '#888', fontFamily: 'monospace' }}>
      {children}
    </kbd>
  );
}

const hudStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10000,
  background: 'rgba(10,10,26,0.96)',
  border: '1px solid #3a3a6a',
  borderRadius: 8,
  padding: '12px 16px',
  minWidth: 380,
  maxWidth: 680,
  boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
  pointerEvents: 'auto',
};

const warningStyle: React.CSSProperties = {
  background: '#1e110a',
  border: '1px solid #f39c1250',
  borderRadius: 4,
  color: '#f39c12',
  fontSize: 11,
  padding: '3px 9px',
};

const btnBase: React.CSSProperties = {
  background: 'none',
  border: '1px solid',
  borderRadius: 4,
  padding: '5px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'sans-serif',
};
