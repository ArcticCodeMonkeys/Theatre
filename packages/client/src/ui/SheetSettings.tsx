import React, { useState } from 'react';
import { CharacterSheet } from '../types/sheets';
import { ImageRecord } from '../types/images';

const API = 'http://localhost:3001';

interface Props {
  sheet: CharacterSheet;
  /** The image currently being dragged from the Images tab (may be null). */
  draggingImage: ImageRecord | null;
  onUpdate: (updated: CharacterSheet) => void;
  onClose: () => void;
}

export function SheetSettings({ sheet, draggingImage, onUpdate, onClose }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const tokenImage: ImageRecord | null = (() => {
    try { return sheet.token_image ? JSON.parse(sheet.token_image) : null; } catch { return null; }
  })();

  const patch = async (body: Partial<CharacterSheet>) => {
    const res = await fetch(`${API}/api/sheets/${sheet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    onUpdate(await res.json() as CharacterSheet);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!draggingImage) return;
    patch({ token_image: JSON.stringify(draggingImage) });
  };

  const handleClear = () => patch({ token_image: null });

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        {/* Title bar */}
        <div style={titleBarStyle}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#cdd6f4' }}>
            {sheet.name} — Settings
          </span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {/* Token image */}
          <div style={sectionHeaderStyle}>Token Image</div>
          <p style={{ color: '#666', fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
            Switch to the 🖼 Images tab and drag an image onto the zone below.
          </p>
          <div
            style={{
              ...dropZoneStyle,
              ...(dragOver ? dropZoneHoverStyle : {}),
              ...(tokenImage && !dragOver ? { borderColor: '#7b8cde40' } : {}),
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {tokenImage ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <img
                  src={`${API}${tokenImage.url}`}
                  alt={tokenImage.original}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #7b8cde' }}
                />
                <span style={{ color: '#aaa', fontSize: 11 }}>{tokenImage.original}</span>
                {dragOver && (
                  <span style={{ color: '#7b8cde', fontSize: 11 }}>Drop to replace</span>
                )}
              </div>
            ) : (
              <span style={{ color: dragOver ? '#7b8cde' : '#444', fontSize: 12, transition: 'color 0.1s' }}>
                {dragOver ? '📥 Drop image here' : 'Drag an image here'}
              </span>
            )}
          </div>
          {tokenImage && (
            <button style={clearBtnStyle} onClick={handleClear}>Remove image</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 9000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

const dialogStyle: React.CSSProperties = {
  background: '#12122a',
  border: '1px solid #3a3a6a',
  borderRadius: 8,
  width: 320,
  maxWidth: '90vw',
  boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
  pointerEvents: 'auto',
};

const titleBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  borderBottom: '1px solid #2a2a4a',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: 2,
};

const sectionHeaderStyle: React.CSSProperties = {
  color: '#7b8cde',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  marginBottom: 6,
};

const dropZoneStyle: React.CSSProperties = {
  border: '2px dashed #2a2a4a',
  borderRadius: 8,
  minHeight: 120,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'border-color 0.15s, background 0.15s',
  cursor: 'default',
};

const dropZoneHoverStyle: React.CSSProperties = {
  borderColor: '#7b8cde',
  background: '#1a1a3a',
};

const clearBtnStyle: React.CSSProperties = {
  marginTop: 8,
  background: 'none',
  border: '1px solid #3a2a2a',
  borderRadius: 4,
  color: '#f38ba8',
  cursor: 'pointer',
  fontSize: 11,
  padding: '3px 10px',
};
