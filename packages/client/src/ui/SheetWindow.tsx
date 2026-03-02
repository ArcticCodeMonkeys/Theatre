import React, { useEffect, useRef, useState } from 'react';
import { CharacterSheet as Sheet, AttackEntry } from '../types/sheets';
import { CharacterSheet } from './CharacterSheet';

export interface SheetWindowState {
  sheet: Sheet;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props extends SheetWindowState {
  zIndex: number;
  onClose: (id: number) => void;
  onUpdate: (updated: Sheet) => void;
  onFocus: (id: number) => void;
  onUseAttack?: (attack: AttackEntry) => void;
}

const MIN_W = 480;
const MIN_H = 320;

export function SheetWindow({ sheet, x: initX, y: initY, w: initW, h: initH, zIndex, onClose, onUpdate, onFocus, onUseAttack }: Props) {
  // Use refs for drag/resize to avoid re-renders during mouse move
  const windowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: initX, y: initY, w: initW, h: initH });
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  // Force a re-render to reflect final position after drag ends
  const [, bump] = useState(0);

  const applyPos = () => {
    const el = windowRef.current;
    if (!el) return;
    const { x, y, w, h } = pos.current;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
  };

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocus(sheet.id);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.current.x, oy: pos.current.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      pos.current.x = dragStart.current.ox + ev.clientX - dragStart.current.mx;
      pos.current.y = Math.max(0, dragStart.current.oy + ev.clientY - dragStart.current.my);
      applyPos();
    };
    const onUp = () => {
      dragStart.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      bump(v => v + 1);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Resize ────────────────────────────────────────────────────────────────
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(sheet.id);
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: pos.current.w, oh: pos.current.h };

    const onMove = (ev: MouseEvent) => {
      if (!resizeStart.current) return;
      pos.current.w = Math.max(MIN_W, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      pos.current.h = Math.max(MIN_H, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      applyPos();
    };
    const onUp = () => {
      resizeStart.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      bump(v => v + 1);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Apply initial position on mount
  useEffect(() => { applyPos(); }, []);

  return (
    <div
      ref={windowRef}
      onMouseDown={() => onFocus(sheet.id)}
      style={{
        position: 'fixed',
        left: pos.current.x,
        top: pos.current.y,
        width: pos.current.w,
        height: pos.current.h,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: '#12122a',
        border: '1px solid #3a3a6a',
        borderRadius: 8,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        minWidth: MIN_W,
        minHeight: MIN_H,
      }}
    >
      {/* ── Title bar ── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          height: 34,
          background: '#0a0a18',
          borderBottom: '1px solid #2a2a4a',
          cursor: 'grab',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#7b8cde', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
          📜 {sheet.name}{sheet.level > 0 ? ` — Lv ${sheet.level}` : ''}
        </span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => onClose(sheet.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
          }}
          title="Close"
        >×</button>
      </div>

      {/* ── Sheet content (scrollable) ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <CharacterSheet sheet={sheet} onUpdate={onUpdate} onUseAttack={onUseAttack} />
      </div>

      {/* ── Resize handle ── */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Resize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="2" y1="10" x2="10" y2="2" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="5" y1="10" x2="10" y2="5" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="10" x2="10" y2="8" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}
