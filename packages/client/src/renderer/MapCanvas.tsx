import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ImageRecord } from '../types/images';
import { CharacterSheet } from '../types/sheets';
import { TargetingMode } from '../types/targeting';
import {
  CanvasState, PlacedImage,
  getLayer, setLayer, allImages,
} from './canvasState';
import { distanceFt, getAoeTiles, isAreaAttack, FT_PER_TILE } from './targetingGeom';

const CELL = 64;
const API = 'http://localhost:3001';
const HANDLE_SIZE = 10;
const ROT_HANDLE_DIST = 28;
const SEL_COLOR = '#7b8cde';

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function toPixels(p: PlacedImage) {
  return { x: p.col * CELL, y: p.row * CELL, w: p.wTiles * CELL, h: p.hTiles * CELL };
}

function hitTest(p: PlacedImage, mx: number, my: number): boolean {
  const { x, y, w, h } = toPixels(p);
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'rot' | null;

function getHandlePositions(p: PlacedImage): Record<string, { x: number; y: number }> {
  const { x, y, w, h } = toPixels(p);
  return {
    nw:  { x,        y },
    ne:  { x: x + w, y },
    se:  { x: x + w, y: y + h },
    sw:  { x,        y: y + h },
    rot: { x: x + w / 2, y: y - ROT_HANDLE_DIST },
  };
}

function hitHandle(p: PlacedImage, mx: number, my: number): HandleType {
  for (const [name, pos] of Object.entries(getHandlePositions(p))) {
    if (Math.hypot(mx - pos.x, my - pos.y) <= HANDLE_SIZE + 2) return name as HandleType;
  }
  return null;
}

// ─── Targeting overlay ────────────────────────────────────────────────────────

function drawTargetingOverlay(canvas: HTMLCanvasElement, state: CanvasState, mode: TargetingMode) {
  const ctx = canvas.getContext('2d')!;
  const toks = allImages(state);
  const { attack } = mode;
  const isArea = isAreaAttack(attack.target);

  // Global dim
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const attackerTok = mode.attackerTokenId ? toks.find(t => t.id === mode.attackerTokenId) : null;

  if (!isArea) {
    // Re-draw each sheet token on top of the dim with a range-indicating ring
    for (const tok of toks) {
      if (tok.sheetId === undefined) continue;
      const { x, y, w, h } = toPixels(tok);
      const dist = attackerTok ? distanceFt(attackerTok, tok) : 0;
      const inShort = !attackerTok || dist <= attack.rangeShort;
      const inLong  = !attackerTok || dist <= attack.rangeLong;
      const selected = mode.selectedSheetIds.includes(tok.sheetId);

      ctx.save();
      ctx.globalAlpha = inLong ? 1 : 0.35;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((tok.rotation * Math.PI) / 180);
      ctx.drawImage(tok.htmlImg, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Selection fill
      if (selected) {
        ctx.fillStyle = 'rgba(243,156,18,0.22)';
        ctx.fillRect(x, y, w, h);
      }

      // Ring
      ctx.strokeStyle = selected ? '#f39c12' : !inLong ? '#444' : !inShort ? '#e67e22' : '#2ecc71';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }
  } else {
    // AoE preview / confirmed overlay
    const center = mode.aoeCell ?? mode.hoveredCell;
    if (center) {
      const origin = attackerTok ? { col: attackerTok.col, row: attackerTok.row } : center;
      const coneDist = Math.sqrt((center.col - origin.col) ** 2 + (center.row - origin.row) ** 2) * FT_PER_TILE;
      const coneLen = coneDist > 0 ? coneDist : (attack.rangeShort || 20);
      const tiles = getAoeTiles(attack.target, origin, center, attack.radius ?? 20, coneLen);

      const confirmed = mode.aoeCell !== null;
      ctx.fillStyle = confirmed ? 'rgba(243,112,168,0.38)' : 'rgba(123,140,222,0.28)';
      for (const t of tiles) ctx.fillRect(t.col * CELL, t.row * CELL, CELL, CELL);

      ctx.strokeStyle = confirmed ? 'rgba(243,112,168,0.85)' : 'rgba(123,140,222,0.55)';
      ctx.lineWidth = 1;
      for (const t of tiles) ctx.strokeRect(t.col * CELL + 0.5, t.row * CELL + 0.5, CELL - 1, CELL - 1);

      // Re-draw tokens in AoE + pink ring
      const tileSet = new Set(tiles.map(t => `${t.col},${t.row}`));
      for (const tok of toks) {
        if (!tileSet.has(`${tok.col},${tok.row}`)) continue;
        const { x, y, w, h } = toPixels(tok);
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((tok.rotation * Math.PI) / 180);
        ctx.drawImage(tok.htmlImg, -w / 2, -h / 2, w, h);
        ctx.restore();
        if (tok.sheetId !== undefined) {
          ctx.strokeStyle = '#f38ba8'; ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
        }
      }
    }
  }

  // Hovered cell dashed cursor
  if (mode.hoveredCell) {
    const { col, row } = mode.hoveredCell;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);
    ctx.setLineDash([]);
  }

  // Attacker token green indicator
  if (attackerTok) {
    const { x, y, w, h } = toPixels(attackerTok);
    ctx.strokeStyle = '#7b8cde'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
}


function drawScene(canvas: HTMLCanvasElement, state: CanvasState) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  // Map layer first, then token layer on top
  for (const layer of [state.mapLayer, state.tokenLayer]) {
    for (const p of layer) {
      const { x, y, w: pw, h: ph } = toPixels(p);
      ctx.save();
      ctx.translate(x + pw / 2, y + ph / 2);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.drawImage(p.htmlImg, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    }
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(180,180,220,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += CELL) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
  for (let y = 0; y <= h; y += CELL) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
  ctx.stroke();

  // Selection overlay
  if (state.selectedId) {
    const sel = allImages(state).find(p => p.id === state.selectedId);
    if (sel) drawSelection(ctx, sel);
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, p: PlacedImage) {
  const { x, y, w, h } = toPixels(p);

  // Dashed border in rotated space
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.strokeStyle = SEL_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);
  ctx.restore();

  // Rotation stem
  const handles = getHandlePositions(p);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(handles.rot.x, handles.rot.y);
  ctx.strokeStyle = SEL_COLOR;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Handles
  for (const [name, pos] of Object.entries(handles)) {
    ctx.beginPath();
    if (name === 'rot') {
      ctx.arc(pos.x, pos.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.rect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fillStyle = SEL_COLOR;
    }
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  stateRef: React.MutableRefObject<CanvasState>;
  onStateChange: (next: CanvasState) => void;
  draggingImage: ImageRecord | null;
  draggingSheet: CharacterSheet | null;
  targetingMode: TargetingMode | null;
  onTargetingUpdate: (update: Partial<TargetingMode>) => void;
  onContextMenu: (image: PlacedImage, clientX: number, clientY: number) => void;
}

export function MapCanvas({ stateRef, onStateChange, draggingImage, draggingSheet, targetingMode, onTargetingUpdate, onContextMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep a ref so drawTargetingOverlay inside redraw always sees the latest value
  const targetingRef = useRef<TargetingMode | null>(targetingMode);
  useEffect(() => { targetingRef.current = targetingMode; });

  const drag = useRef<{
    type: 'move' | HandleType;
    id: string;
    startMx: number; startMy: number;
    origCol: number; origRow: number;
    origW: number; origH: number;
    origRot: number;
  } | null>(null);

  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    drawScene(canvasRef.current, stateRef.current);
    if (targetingRef.current) drawTargetingOverlay(canvasRef.current, stateRef.current, targetingRef.current);
  }, [stateRef]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      canvas.width = window.innerWidth - 200;
      canvas.height = window.innerHeight - 38;
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  // Redraw on every render cycle (state changes bubble up through parent)
  useEffect(() => { redraw(); });

  // Keyboard delete — skip when targeting (App.tsx owns that)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (targetingRef.current) return;
      const s = stateRef.current;
      if (!s.selectedId) return;
      onStateChange({
        ...s,
        mapLayer:   s.mapLayer.filter(p => p.id !== s.selectedId),
        tokenLayer: s.tokenLayer.filter(p => p.id !== s.selectedId),
        selectedId: null,
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stateRef, onStateChange]);

  // ── Mouse down ───────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // ── Targeting mode ──────────────────────────────────────────────────────
    if (targetingRef.current) {
      const mode = targetingRef.current;
      const col = Math.floor(mx / CELL);
      const row = Math.floor(my / CELL);
      const attack = mode.attack;

      if (isAreaAttack(attack.target)) {
        // Place AoE centre / cone endpoint
        onTargetingUpdate({ aoeCell: { col, row }, warnings: [] });
      } else {
        // Try to select/deselect a token
        const s = stateRef.current;
        const allToks = [...s.mapLayer, ...s.tokenLayer].reverse();
        const clicked = allToks.find(t => t.sheetId !== undefined && hitTest(t, mx, my));

        const warnings: string[] = [];
        if (clicked && clicked.sheetId !== undefined) {
          const attackerTok = mode.attackerTokenId
            ? [...s.mapLayer, ...s.tokenLayer].find(t => t.id === mode.attackerTokenId)
            : null;

          if (attackerTok) {
            const dist = distanceFt(attackerTok, clicked);
            if (dist > attack.rangeLong) {
              warnings.push(`Out of range (${Math.round(dist)} ft — max ${attack.rangeLong} ft)`);
            } else if (dist > attack.rangeShort) {
              warnings.push(`Long range — attack will have Graze (${Math.round(dist)} ft)`);
            }
          }

          const current = mode.selectedSheetIds;
          const alreadySelected = current.includes(clicked.sheetId);
          const maxTargets = attack.targetCount ?? 1;

          let newIds: number[];
          if (alreadySelected) {
            newIds = current.filter(id => id !== clicked.sheetId);
          } else {
            if (current.length >= maxTargets) {
              warnings.push(`Already at max targets (${maxTargets}) — deselect one first or confirm as-is`);
            }
            newIds = [...current, clicked.sheetId];
          }
          onTargetingUpdate({ selectedSheetIds: newIds, warnings });
        } else {
          onTargetingUpdate({ warnings: ['No sheet-linked token at that position'] });
        }
      }
      return; // swallow all normal canvas interaction
    }

    // ── Normal canvas interaction ────────────────────────────────────────────
    const s = stateRef.current;

    if (s.selectedId) {
      const sel = allImages(s).find(p => p.id === s.selectedId)!;
      const h = hitHandle(sel, mx, my);
      if (h) {
        drag.current = { type: h, id: sel.id, startMx: mx, startMy: my, origCol: sel.col, origRow: sel.row, origW: sel.wTiles, origH: sel.hTiles, origRot: sel.rotation };
        return;
      }
    }

    // Only hit-test images on the active layer (highest index = topmost)
    const activeLayerImages = [...(s.activeLayer === 'map' ? s.mapLayer : s.tokenLayer)];
    for (const p of activeLayerImages.reverse()) {
      if (hitTest(p, mx, my)) {
        onStateChange({ ...s, selectedId: p.id });
        drag.current = { type: 'move', id: p.id, startMx: mx, startMy: my, origCol: p.col, origRow: p.row, origW: p.wTiles, origH: p.hTiles, origRot: p.rotation };
        return;
      }
    }

    onStateChange({ ...s, selectedId: null });
  };

  // ── Mouse move ───────────────────────────────────────────────────────────
  const onMouseMove = (e: React.MouseEvent) => {
    // Update hovered cell during targeting for live AoE preview
    if (targetingRef.current) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / CELL);
      const row = Math.floor((e.clientY - rect.top) / CELL);
      if (col !== targetingRef.current.hoveredCell?.col || row !== targetingRef.current.hoveredCell?.row) {
        onTargetingUpdate({ hoveredCell: { col, row } });
      }
      return;
    }
    if (!drag.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const d = drag.current;
    const s = stateRef.current;
    const dx = mx - d.startMx;
    const dy = my - d.startMy;

    const upd = (fn: (p: PlacedImage) => PlacedImage): CanvasState => ({
      ...s,
      mapLayer:   s.mapLayer.map(p => p.id === d.id ? fn(p) : p),
      tokenLayer: s.tokenLayer.map(p => p.id === d.id ? fn(p) : p),
    });

    let next: CanvasState;
    switch (d.type) {
      case 'move': next = upd(p => ({ ...p, col: Math.max(0, Math.round(d.origCol + dx / CELL)), row: Math.max(0, Math.round(d.origRow + dy / CELL)) })); break;
      case 'se':   next = upd(p => ({ ...p, wTiles: Math.max(1, Math.round(d.origW + dx / CELL)), hTiles: Math.max(1, Math.round(d.origH + dy / CELL)) })); break;
      case 'ne':   next = upd(p => ({ ...p, row: Math.max(0, Math.round(d.origRow + dy / CELL)), wTiles: Math.max(1, Math.round(d.origW + dx / CELL)), hTiles: Math.max(1, Math.round(d.origH - dy / CELL)) })); break;
      case 'sw':   next = upd(p => ({ ...p, col: Math.max(0, Math.round(d.origCol + dx / CELL)), wTiles: Math.max(1, Math.round(d.origW - dx / CELL)), hTiles: Math.max(1, Math.round(d.origH + dy / CELL)) })); break;
      case 'nw':   next = upd(p => ({ ...p, col: Math.max(0, Math.round(d.origCol + dx / CELL)), row: Math.max(0, Math.round(d.origRow + dy / CELL)), wTiles: Math.max(1, Math.round(d.origW - dx / CELL)), hTiles: Math.max(1, Math.round(d.origH - dy / CELL)) })); break;
      case 'rot': {
        const sel = allImages(s).find(p => p.id === d.id)!;
        const { x, y, w, h } = toPixels(sel);
        const angle = Math.atan2(my - (y + h / 2), mx - (x + w / 2)) * (180 / Math.PI) + 90;
        next = upd(p => ({ ...p, rotation: Math.round(angle / 90) * 90 }));
        break;
      }
      default: return;
    }

    onStateChange(next);
    drawScene(canvasRef.current!, next);
  };

  const onMouseUp = () => { drag.current = null; };

  // ── Right-click context menu ──────────────────────────────────────────────
  const onRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const s = stateRef.current;

    const activeLayerImages = [...(s.activeLayer === 'map' ? s.mapLayer : s.tokenLayer)];
    for (const p of activeLayerImages.reverse()) {
      if (hitTest(p, mx, my)) {
        onContextMenu(p, e.clientX, e.clientY);
        return;
      }
    }
  };

  // ── Drop from image library or sheet list ────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL);
    const row = Math.floor((e.clientY - rect.top) / CELL);
    const s = stateRef.current;

    // Determine source: sheet token image takes priority over image library drag
    let imgRecord: ImageRecord | null = null;
    let sheetId: number | undefined;

    if (draggingSheet) {
      try { imgRecord = draggingSheet.token_image ? JSON.parse(draggingSheet.token_image) as ImageRecord : null; }
      catch { imgRecord = null; }
      sheetId = draggingSheet.id;
    } else if (draggingImage) {
      imgRecord = draggingImage;
    }

    if (!imgRecord) return;

    const finalImg = imgRecord;
    const htmlImg = new Image();
    htmlImg.onload = () => {
      const placed: PlacedImage = {
        id: `${Date.now()}-${Math.random()}`,
        layer: s.activeLayer,
        img: finalImg,
        htmlImg,
        col, row,
        wTiles: 1,
        hTiles: 1,
        rotation: 0,
        ...(sheetId !== undefined ? { sheetId } : {}),
      };
      onStateChange(setLayer(s, s.activeLayer, [...getLayer(s, s.activeLayer), placed]));
    };
    htmlImg.src = `${API}${finalImg.url}`;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onRightClick}
    />
  );
}
