import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapCanvas } from './renderer/MapCanvas';
import { SidePanel } from './ui/SidePanel';
import { LayerToolbar } from './ui/LayerToolbar';
import { ContextMenu } from './ui/ContextMenu';
import { SheetWindow, SheetWindowState } from './ui/SheetWindow';
import { TargetingHUD } from './ui/TargetingHUD';
import { ChatHandle } from './ui/Chat';
import { ImageRecord } from './types/images';
import { CharacterSheet, AttackEntry, ActiveCondition } from './types/sheets';
import { AppUser } from './types/user';
import { TargetingMode } from './types/targeting';
import { getAoeTiles, isAreaAttack, FT_PER_TILE } from './renderer/targetingGeom';
import { resolveVariables, rollExpression, DiceVars } from './lib/dice';
import {
  CanvasState, PlacedImage, LayerName,
  moveToFront, moveToBack, moveForward, moveBackward,
  setLayer, getLayer,
} from './renderer/canvasState';

const INITIAL_STATE: CanvasState = {
  mapLayer: [], tokenLayer: [], selectedId: null, activeLayer: 'token',
};

interface ContextMenuState {
  image: PlacedImage; x: number; y: number;
}

// Each open window tracks position/size + z-order
interface WindowEntry extends SheetWindowState {
  zBase: number;
}

let zCounter = 100;

export function App({ user }: { user: AppUser }) {
  const stateRef = useRef<CanvasState>(INITIAL_STATE);
  const chatRef = useRef<ChatHandle>(null);
  const [, setVersion] = useState(0);
  const [draggingImage, setDraggingImage] = useState<ImageRecord | null>(null);
  const [draggingSheet, setDraggingSheet] = useState<CharacterSheet | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [windows, setWindows] = useState<WindowEntry[]>([]);
  const [savedSheet, setSavedSheet] = useState<CharacterSheet | undefined>();
  const [targetingMode, setTargetingMode] = useState<TargetingMode | null>(null);

  const handleStateChange = useCallback((next: CanvasState) => {
    stateRef.current = next; setVersion(v => v + 1);
  }, []);

  const handleLayerChange = useCallback((layer: LayerName) => {
    handleStateChange({ ...stateRef.current, activeLayer: layer });
  }, [handleStateChange]);

  const handleContextMenu = useCallback((image: PlacedImage, clientX: number, clientY: number) => {
    setContextMenu({ image, x: clientX, y: clientY });
  }, []);

  // ── Context menu handlers ─────────────────────────────────────────────────

  const handleDelete = useCallback((id: string) => {
    const s = stateRef.current;
    handleStateChange({
      ...s,
      mapLayer: s.mapLayer.filter(p => p.id !== id),
      tokenLayer: s.tokenLayer.filter(p => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    });
  }, [handleStateChange]);

  const handleMoveLayer = useCallback((id: string, toLayer: LayerName) => {
    const s = stateRef.current;
    const img = [...s.mapLayer, ...s.tokenLayer].find(p => p.id === id);
    if (!img) return;
    const fromLayer: LayerName = img.layer === 'map' ? 'map' : 'token';
    const updated: PlacedImage = { ...img, layer: toLayer };
    let next = setLayer(s, fromLayer, getLayer(s, fromLayer).filter(p => p.id !== id));
    next = setLayer(next, toLayer, [...getLayer(next, toLayer), updated]);
    handleStateChange(next);
  }, [handleStateChange]);

  const handleSetDimensions = useCallback((id: string, w: number, h: number) => {
    const s = stateRef.current;
    const upd = (arr: PlacedImage[]) => arr.map(p => p.id === id ? { ...p, wTiles: w, hTiles: h } : p);
    handleStateChange({ ...s, mapLayer: upd(s.mapLayer), tokenLayer: upd(s.tokenLayer) });
  }, [handleStateChange]);

  const handleMoveToFront   = useCallback((id: string) => handleStateChange(moveToFront(stateRef.current, id)), [handleStateChange]);
  const handleMoveToBack    = useCallback((id: string) => handleStateChange(moveToBack(stateRef.current, id)), [handleStateChange]);
  const handleMoveForward   = useCallback((id: string) => handleStateChange(moveForward(stateRef.current, id)), [handleStateChange]);
  const handleMoveBackward  = useCallback((id: string) => handleStateChange(moveBackward(stateRef.current, id)), [handleStateChange]);

  // ── Sheet window handlers ─────────────────────────────────────────────────

  const handleOpenSheet = useCallback((sheet: CharacterSheet) => {
    setWindows(prev => {
      // Already open? Bring to front
      if (prev.find(w => w.sheet.id === sheet.id)) {
        return prev.map(w => w.sheet.id === sheet.id ? { ...w, zBase: ++zCounter } : w);
      }
      const offset = (prev.length % 8) * 24;
      return [...prev, {
        sheet,
        x: 60 + offset, y: 60 + offset,
        w: 560, h: 700,
        zBase: ++zCounter,
      }];
    });
  }, []);

  const handleOpenSheetById = useCallback(async (sheetId: number) => {
    const res = await fetch(`http://localhost:3001/api/sheets/${sheetId}`);
    if (!res.ok) return;
    handleOpenSheet(await res.json() as CharacterSheet);
  }, [handleOpenSheet]);

  const handleCloseSheet = useCallback((id: number) => {
    setWindows(prev => prev.filter(w => w.sheet.id !== id));
  }, []);

  const handleFocusSheet = useCallback((id: number) => {
    setWindows(prev => prev.map(w => w.sheet.id === id ? { ...w, zBase: ++zCounter } : w));
  }, []);

  const handleUpdateSheet = useCallback((updated: CharacterSheet) => {
    setWindows(prev => prev.map(w => w.sheet.id === updated.id ? { ...w, sheet: updated } : w));
    setSavedSheet(updated);
  }, []);

  // ── Targeting ───────────────────────────────────────────────────────────

  const handleUseAttack = useCallback((attack: AttackEntry, attackerSheet: CharacterSheet) => {
    const allToks = [...stateRef.current.mapLayer, ...stateRef.current.tokenLayer];
    const attackerToken = allToks.find(t => t.sheetId === attackerSheet.id) ?? null;
    setTargetingMode({
      attack, attackerSheet,
      attackerTokenId: attackerToken?.id ?? null,
      selectedSheetIds: [],
      aoeCell: null, hoveredCell: null, warnings: [],
    });
  }, []);

  const handleTargetingUpdate = useCallback((update: Partial<TargetingMode>) => {
    setTargetingMode(prev => prev ? { ...prev, ...update } : null);
  }, []);

  const confirmTargeting = useCallback(async () => {
    if (!targetingMode) return;
    const mode = targetingMode;
    const { attack, attackerSheet } = mode;
    const allToks = [...stateRef.current.mapLayer, ...stateRef.current.tokenLayer];

    // Resolve target sheet IDs
    let targetSheetIds: number[];
    if (isAreaAttack(attack.target)) {
      if (!mode.aoeCell) return;
      const attackerTok = mode.attackerTokenId ? allToks.find(t => t.id === mode.attackerTokenId) : null;
      const origin = attackerTok ? { col: attackerTok.col, row: attackerTok.row } : mode.aoeCell;
      const coneDist = Math.sqrt((mode.aoeCell.col - origin.col) ** 2 + (mode.aoeCell.row - origin.row) ** 2) * FT_PER_TILE;
      const tiles = getAoeTiles(attack.target, origin, mode.aoeCell, attack.radius ?? 20, coneDist > 0 ? coneDist : (attack.rangeShort || 20));
      const tileSet = new Set(tiles.map(t => `${t.col},${t.row}`));
      targetSheetIds = allToks.filter(t => t.sheetId !== undefined && tileSet.has(`${t.col},${t.row}`)).map(t => t.sheetId!);
    } else {
      targetSheetIds = mode.selectedSheetIds;
    }

    setTargetingMode(null);

    // Roll damages (always, even if no targets — the action still happened)
    const statVars: DiceVars = {
      MIG: attackerSheet.mig_score, DEX: attackerSheet.dex_score,
      WIL: attackerSheet.wil_score, PRE: attackerSheet.pre_score,
      PB: 1 + Math.ceil(attackerSheet.level / 3),
    };
    const rolls = attack.damages.map(d => {
      const resolved = resolveVariables(d.expression, statVars);
      const result = rollExpression(resolved);
      return { expression: d.expression, resolved, type: d.type, total: result?.total ?? 0 };
    });
    const totalDmg = rolls.reduce((s, r) => s + r.total, 0);

    // Conditions to apply
    const conditionsToApply: ActiveCondition[] = attack.conditions
      .filter(c => c.trim()).map(c => ({ name: c, severity: 1 }));

    const targetNames: string[] = [];
    for (const sheetId of targetSheetIds) {
      const res = await fetch(`http://localhost:3001/api/sheets/${sheetId}`);
      if (!res.ok) continue;
      const target: CharacterSheet = await res.json();
      targetNames.push(target.name);
      const newHp = Math.max(0, target.hp_current - totalDmg);
      const existing: ActiveCondition[] = (() => { try { return JSON.parse(target.conditions); } catch { return []; } })();
      const merged = [...existing];
      for (const nc of conditionsToApply) {
        const ex = merged.find(c => c.name.toLowerCase() === nc.name.toLowerCase());
        if (ex) ex.severity = Math.min(ex.severity + 1, 5);
        else merged.push(nc);
      }
      const patched: CharacterSheet = { ...target, hp_current: newHp, conditions: JSON.stringify(merged) };
      await fetch(`http://localhost:3001/api/sheets/${sheetId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hp_current: newHp, conditions: JSON.stringify(merged) }),
      });
      handleUpdateSheet(patched);
    }

    // Log to chat via the imperative handle so it appears instantly
    const rollLines = rolls.map(r =>
      r.expression !== r.resolved
        ? `${r.expression} → ${r.resolved} [${r.type}] = ${r.total}`
        : `${r.expression} [${r.type}] = ${r.total}`
    );
    const condLine = conditionsToApply.length > 0 ? `inflicts: ${conditionsToApply.map(c => c.name).join(', ')}` : '';
    const targetLine = targetSheetIds.length > 0
      ? `Total: ${totalDmg} dmg → ${targetNames.join(', ')}`
      : `Total: ${totalDmg} dmg → (no targets in area)`;
    const summaryLines = [
      ...rollLines,
      targetLine,
      ...(condLine ? [condLine] : []),
    ];
    chatRef.current?.push({
      type: 'roll',
      title: `${attackerSheet.name} — ${attack.name}`,
      content: summaryLines.join('\n'),
    });
  }, [targetingMode, handleUpdateSheet]);

  // Keyboard handler for targeting mode
  useEffect(() => {
    if (!targetingMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { confirmTargeting(); }
      else if (e.key === 'Escape') { setTargetingMode(null); }
      else if (e.key === 'Backspace' && !isAreaAttack(targetingMode.attack.target)) {
        e.preventDefault();
        setTargetingMode(prev => prev ? { ...prev, selectedSheetIds: prev.selectedSheetIds.slice(0, -1), warnings: [] } : null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [targetingMode, confirmTargeting]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <LayerToolbar activeLayer={stateRef.current.activeLayer} onChange={handleLayerChange} />
        <div style={{ paddingTop: 38 }}>
          <MapCanvas
            stateRef={stateRef}
            onStateChange={handleStateChange}
            draggingImage={draggingImage}
            draggingSheet={draggingSheet}
            targetingMode={targetingMode}
            onTargetingUpdate={handleTargetingUpdate}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>

      <SidePanel
        onDragStart={setDraggingImage}
        onOpenSheet={handleOpenSheet}
        onSheetDragStart={setDraggingSheet}
        draggingImage={draggingImage}
        savedSheet={savedSheet}
        chatRef={chatRef}
      />

      {/* Floating sheet windows — hidden during targeting so the canvas is clear */}
      {windows.map(win => (
        <div key={win.sheet.id} style={targetingMode ? { display: 'none' } : {}}>
          <SheetWindow
            sheet={win.sheet}
            x={win.x} y={win.y} w={win.w} h={win.h}
            zIndex={win.zBase}
            onClose={handleCloseSheet}
            onUpdate={handleUpdateSheet}
            onFocus={handleFocusSheet}
            onUseAttack={attack => handleUseAttack(attack, win.sheet)}
          />
        </div>
      ))}

      {contextMenu && (
        <ContextMenu
          image={contextMenu.image}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={handleDelete}
          onMoveLayer={handleMoveLayer}
          onSetDimensions={handleSetDimensions}
          onMoveToFront={handleMoveToFront}
          onMoveToBack={handleMoveToBack}
          onMoveForward={handleMoveForward}
          onMoveBackward={handleMoveBackward}
          onOpenSheet={handleOpenSheetById}
        />)}

      {/* Targeting HUD */}
      {targetingMode && (
        <TargetingHUD
          mode={targetingMode}
          onConfirm={confirmTargeting}
          onCancel={() => setTargetingMode(null)}
        />
      )}
    </div>
  );
}
