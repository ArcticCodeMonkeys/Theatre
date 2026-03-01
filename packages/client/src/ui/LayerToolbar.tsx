import React from 'react';
import { LayerName } from '../renderer/canvasState';

interface Props {
  activeLayer: LayerName;
  onChange: (layer: LayerName) => void;
}

export function LayerToolbar({ activeLayer, onChange }: Props) {
  return (
    <div style={styles.bar}>
      <span style={styles.label}>Layer:</span>
      {(['map', 'token'] as LayerName[]).map(layer => (
        <button
          key={layer}
          style={{ ...styles.btn, ...(activeLayer === layer ? styles.active : {}) }}
          onClick={() => onChange(layer)}
        >
          {layer === 'map' ? '🗺 Map' : '🪙 Token'}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 200,
    height: 38,
    background: '#0f0f22',
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 14px',
    zIndex: 10,
  },
  label: {
    color: '#666',
    fontSize: 12,
    marginRight: 2,
  },
  btn: {
    background: '#1e1e3a',
    color: '#888',
    border: '1px solid #2a2a4a',
    borderRadius: 4,
    padding: '3px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  active: {
    background: '#3a3a6a',
    color: '#ccc',
    borderColor: '#7b8cde',
  },

};
