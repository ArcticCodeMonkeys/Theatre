import React, { useState, useRef, useCallback } from 'react';
import { MapCanvas } from './renderer/MapCanvas';
import { SidePanel } from './ui/SidePanel';
import { LayerToolbar } from './ui/LayerToolbar';
import { ContextMenu } from './ui/ContextMenu';
import { SheetWindow, SheetWindowState } from './ui/SheetWindow';
import { ImageRecord } from './types/images';
import { CharacterSheet } from './types/sheets';
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

export function App() {
  const stateRef = useRef<CanvasState>(INITIAL_STATE);
  const [, setVersion] = useState(0);
  const [draggingImage, setDraggingImage] = useState<ImageRecord | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [windows, setWindows] = useState<WindowEntry[]>([]);
  const [savedSheet, setSavedSheet] = useState<CharacterSheet | undefined>();

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

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <LayerToolbar activeLayer={stateRef.current.activeLayer} onChange={handleLayerChange} />
        <div style={{ paddingTop: 38 }}>
          <MapCanvas
            stateRef={stateRef}
            onStateChange={handleStateChange}
            draggingImage={draggingImage}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>

      <SidePanel onDragStart={setDraggingImage} onOpenSheet={handleOpenSheet} savedSheet={savedSheet} />

      {/* Floating sheet windows */}
      {windows.map(win => (
        <SheetWindow
          key={win.sheet.id}
          sheet={win.sheet}
          x={win.x} y={win.y} w={win.w} h={win.h}
          zIndex={win.zBase}
          onClose={handleCloseSheet}
          onUpdate={handleUpdateSheet}
          onFocus={handleFocusSheet}
        />
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
        />
      )}
    </div>
  );
}
