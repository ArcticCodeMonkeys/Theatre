import React, { useEffect, useRef, useState } from 'react';
import { ImageRecord } from '../types/images';
import { CharacterSheet, emptySheet } from '../types/sheets';
import { Chat } from './Chat';

const API = 'http://localhost:3001';

interface Props {
  onDragStart: (img: ImageRecord) => void;
  onOpenSheet: (sheet: CharacterSheet) => void;
  savedSheet?: CharacterSheet;
}

type Tab = 'images' | 'sheets' | 'chat';

export function SidePanel({ onDragStart, onOpenSheet, savedSheet }: Props) {
  const [tab, setTab] = useState<Tab>('images');

  // ── Images state ──────────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    const res = await fetch(`${API}/api/images`);
    setImages(await res.json());
  };
  useEffect(() => { fetchImages(); }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('image', file);
      await fetch(`${API}/api/images`, { method: 'POST', body: form });
    }
    setUploading(false);
    fetchImages();
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Sheets state ──────────────────────────────────────────────────────────
  const [sheets, setSheets] = useState<CharacterSheet[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchSheets = async () => {
    const res = await fetch(`${API}/api/sheets`);
    setSheets(await res.json());
  };
  useEffect(() => { fetchSheets(); }, []);

  // Keep list in sync when a sheet is saved from an open window
  useEffect(() => {
    if (!savedSheet) return;
    setSheets(prev => prev.map(s => s.id === savedSheet.id ? savedSheet : s));
  }, [savedSheet]);

  const handleNewSheet = async () => {
    setCreating(true);
    const res = await fetch(`${API}/api/sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emptySheet()),
    });
    const sheet = await res.json() as CharacterSheet;
    setCreating(false);
    setSheets(prev => [sheet, ...prev]);
    onOpenSheet(sheet);
  };

  const handleDeleteSheet = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await fetch(`${API}/api/sheets/${id}`, { method: 'DELETE' });
    setSheets(prev => prev.filter(s => s.id !== id));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={panelStyle}>
      {/* Tab bar */}
      <div style={tabBarStyle}>
        {(['images', 'sheets', 'chat'] as Tab[]).map(t => (
          <button
            key={t}
            style={{ ...tabBtnStyle, ...(tab === t ? tabActivStyle : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'images' ? '🖼' : t === 'sheets' ? '📜' : '🎲'}
          </button>
        ))}
      </div>

      {/* ── Images tab ── */}
      {tab === 'images' && (
        <>
          <div style={headerStyle}>
            <span style={titleStyle}>Images</span>
            <button style={actionBtnStyle} onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? '…' : '+ Upload'}
            </button>
            <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          <div style={listStyle}>
            {images.length === 0 && (
              <p style={emptyStyle}>No images yet.<br />Upload one to get started.</p>
            )}
            {images.map(img => (
              <div
                key={img.id}
                style={itemStyle}
                title={img.original}
                draggable
                onDragStart={() => onDragStart(img)}
              >
                <img src={`${API}${img.url}`} alt={img.original} style={thumbStyle} draggable={false} />
                <span style={labelStyle}>{img.original}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Sheets tab ── */}
      {tab === 'sheets' && (
        <>
          <div style={headerStyle}>
            <span style={titleStyle}>Sheets</span>
            <button style={actionBtnStyle} onClick={handleNewSheet} disabled={creating}>
              {creating ? '…' : '+ New'}
            </button>
          </div>
          <div style={listStyle}>
            {sheets.length === 0 && (
              <p style={emptyStyle}>No sheets yet.<br />Create a character to start.</p>
            )}
            {sheets.map(sheet => (
              <div
                key={sheet.id}
                style={sheetItemStyle}
                onClick={() => onOpenSheet(sheet)}
                title="Click to open sheet"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#cdd6f4', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sheet.name}
                  </div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 1 }}>
                    {[sheet.race, sheet.background].filter(Boolean).join(' · ') || 'No race/background'}
                    {' — Lv '}{sheet.level}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button
                    style={{ ...iconBtnStyle, color: '#7b8cde' }}
                    onClick={e => { e.stopPropagation(); onOpenSheet(sheet); }}
                    title="Open"
                  >📖</button>
                  <button
                    style={{ ...iconBtnStyle, color: '#f38ba8' }}
                    onClick={e => handleDeleteSheet(e, sheet.id)}
                    title="Delete"
                  >🗑</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Chat tab — always mounted so history persists ── */}
      <div style={{ display: tab === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
        <Chat />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  width: 200,
  minWidth: 200,
  height: '100vh',
  background: '#12122a',
  borderLeft: '1px solid #2a2a4a',
  display: 'flex',
  flexDirection: 'column',
  userSelect: 'none',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #2a2a4a',
  flexShrink: 0,
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#555',
  padding: '8px 4px',
  fontSize: 11,
  cursor: 'pointer',
  transition: 'color 0.15s',
};

const tabActivStyle: React.CSSProperties = {
  color: '#cdd6f4',
  borderBottom: '2px solid #7b8cde',
  background: '#0f0f22',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 10px',
  borderBottom: '1px solid #2a2a4a',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  color: '#aaa',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const actionBtnStyle: React.CSSProperties = {
  background: '#3a3a6a',
  color: '#ccc',
  border: 'none',
  borderRadius: 4,
  padding: '3px 8px',
  fontSize: 11,
  cursor: 'pointer',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '4px 6px',
  borderRadius: 4,
  background: '#1e1e3a',
  cursor: 'grab',
  border: '1px solid transparent',
};

const thumbStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  objectFit: 'cover',
  borderRadius: 3,
  flexShrink: 0,
  background: '#2a2a4a',
};

const labelStyle: React.CSSProperties = {
  color: '#bbb',
  fontSize: 11,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const sheetItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  borderRadius: 5,
  background: '#1e1e3a',
  cursor: 'pointer',
  border: '1px solid #2a2a4a',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  padding: 0,
  lineHeight: 1,
};

const emptyStyle: React.CSSProperties = {
  color: '#444',
  fontSize: 12,
  textAlign: 'center',
  marginTop: 20,
  lineHeight: 1.6,
};
