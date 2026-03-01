import React, { useEffect, useRef, useState } from 'react';
import { PlacedImage, LayerName } from '../renderer/canvasState';

export interface ContextMenuProps {
  image: PlacedImage;
  x: number;
  y: number;
  onClose: () => void;
  onDelete: (id: string) => void;
  onMoveLayer: (id: string, toLayer: LayerName) => void;
  onSetDimensions: (id: string, w: number, h: number) => void;
  onMoveToFront: (id: string) => void;
  onMoveToBack: (id: string) => void;
  onMoveForward: (id: string) => void;
  onMoveBackward: (id: string) => void;
}

export function ContextMenu({
  image, x, y,
  onClose, onDelete, onMoveLayer, onSetDimensions,
  onMoveToFront, onMoveToBack, onMoveForward, onMoveBackward,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(String(image.wTiles));
  const [h, setH] = useState(String(image.hTiles));

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Keep dimensions in sync if image changes
  useEffect(() => {
    setW(String(image.wTiles));
    setH(String(image.hTiles));
  }, [image.id, image.wTiles, image.hTiles]);

  const applyDims = () => {
    const wn = Math.max(1, parseInt(w, 10) || 1);
    const hn = Math.max(1, parseInt(h, 10) || 1);
    onSetDimensions(image.id, wn, hn);
    onClose();
  };

  const otherLayer: LayerName = image.layer === 'map' ? 'token' : 'map';
  const otherLabel = image.layer === 'map' ? '🪙 Token Layer' : '🗺 Map Layer';

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 9999,
    background: '#1e1e2e',
    border: '1px solid #444466',
    borderRadius: 6,
    padding: '6px 0',
    minWidth: 200,
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    color: '#cdd6f4',
    fontSize: 13,
    fontFamily: 'sans-serif',
    userSelect: 'none',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '4px 12px 2px',
    fontSize: 11,
    color: '#6e738d',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const btnStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '5px 14px',
    background: 'none',
    border: 'none',
    color: '#cdd6f4',
    cursor: 'pointer',
    fontSize: 13,
  };

  const dangerBtnStyle: React.CSSProperties = { ...btnStyle, color: '#f38ba8' };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: '#313244',
    margin: '4px 0',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 14px',
  };

  const inputStyle: React.CSSProperties = {
    width: 44,
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 4,
    color: '#cdd6f4',
    padding: '2px 6px',
    fontSize: 13,
    textAlign: 'center',
  };

  const applyBtnStyle: React.CSSProperties = {
    ...btnStyle,
    padding: '3px 8px',
    background: '#585b70',
    borderRadius: 4,
    width: 'auto',
    fontSize: 12,
  };

  return (
    <div ref={ref} style={menuStyle}>
      {/* Image name */}
      <div style={{ ...sectionStyle, marginBottom: 2 }} title={image.img.original}>
        {image.img.original.length > 24
          ? '…' + image.img.original.slice(-22)
          : image.img.original}
      </div>
      <div style={dividerStyle} />

      {/* Dimensions */}
      <div style={sectionStyle}>Dimensions (tiles)</div>
      <div style={rowStyle}>
        <span>W</span>
        <input
          style={inputStyle}
          type="number"
          min={1}
          value={w}
          onChange={e => setW(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') applyDims(); e.stopPropagation(); }}
        />
        <span>H</span>
        <input
          style={inputStyle}
          type="number"
          min={1}
          value={h}
          onChange={e => setH(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') applyDims(); e.stopPropagation(); }}
        />
        <button style={applyBtnStyle} onClick={applyDims}>Apply</button>
      </div>
      <div style={dividerStyle} />

      {/* Z-order */}
      <div style={sectionStyle}>Order</div>
      <button style={btnStyle} onMouseDown={e => { e.preventDefault(); onMoveToFront(image.id); onClose(); }}>⬆ Bring to Front</button>
      <button style={btnStyle} onMouseDown={e => { e.preventDefault(); onMoveForward(image.id); onClose(); }}>↑ Bring Forward</button>
      <button style={btnStyle} onMouseDown={e => { e.preventDefault(); onMoveBackward(image.id); onClose(); }}>↓ Send Backward</button>
      <button style={btnStyle} onMouseDown={e => { e.preventDefault(); onMoveToBack(image.id); onClose(); }}>⬇ Send to Back</button>
      <div style={dividerStyle} />

      {/* Move layer */}
      <button style={btnStyle} onMouseDown={e => { e.preventDefault(); onMoveLayer(image.id, otherLayer); onClose(); }}>
        ⇄ Move to {otherLabel}
      </button>
      <div style={dividerStyle} />

      {/* Delete */}
      <button style={dangerBtnStyle} onMouseDown={e => { e.preventDefault(); onDelete(image.id); onClose(); }}>
        🗑 Delete
      </button>
    </div>
  );
}
