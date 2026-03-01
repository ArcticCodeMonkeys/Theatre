import React, { useState, useRef, useCallback } from 'react';
import { MapCanvas } from './renderer/MapCanvas';
import { ImageLibrary } from './ui/ImageLibrary';
import { LayerToolbar } from './ui/LayerToolbar';
import { ContextMenu } from './ui/ContextMenu';
import { ImageRecord } from './types/images';
import {
  CanvasState, PlacedImage, LayerName,
  moveToFront, moveToBack, moveForward, moveBackward,
  setLayer, getLayer,
} from './renderer/canvasState';

const INITIAL_STATE: CanvasState = {
  mapLayer: [],
  tokenLayer: [],
  selectedId: null,
  activeLayer: 'token',
};

interface ContextMenuState {
  image: PlacedImage;
  x: number;
  y: number;
}

export function App() {
  // stateRef is the source of truth for the canvas (avoids stale closures in mouse handlers)
  const stateRef = useRef<CanvasState>(INITIAL_STATE);
  // version just triggers re-renders so React redraws
  const [, setVersion] = useState(0);

  const [draggingImage, setDraggingImage] = useState<ImageRecord | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleStateChange = useCallback((next: CanvasState) => {
    stateRef.current = next;
    setVersion(v => v + 1);
  }, []);

  const handleLayerChange = useCallback((layer: LayerName) => {
    handleStateChange({ ...stateRef.current, activeLayer: layer });
  }, [handleStateChange]);

  const handleContextMenu = useCallback((image: PlacedImage, clientX: number, clientY: number) => {
    setContextMenu({ image, x: clientX, y: clientY });
  }, []);

  // ── Context menu action handlers ──────────────────────────────────────────

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
    const newFrom = getLayer(s, fromLayer).filter(p => p.id !== id);
    const newTo = [...getLayer(s, toLayer), updated];
    let next = setLayer(s, fromLayer, newFrom);
    next = setLayer(next, toLayer, newTo);
    handleStateChange(next);
  }, [handleStateChange]);

  const handleSetDimensions = useCallback((id: string, w: number, h: number) => {
    const s = stateRef.current;
    const upd = (arr: PlacedImage[]) => arr.map(p => p.id === id ? { ...p, wTiles: w, hTiles: h } : p);
    handleStateChange({ ...s, mapLayer: upd(s.mapLayer), tokenLayer: upd(s.tokenLayer) });
  }, [handleStateChange]);

  const handleMoveToFront = useCallback((id: string) => {
    handleStateChange(moveToFront(stateRef.current, id));
  }, [handleStateChange]);

  const handleMoveToBack = useCallback((id: string) => {
    handleStateChange(moveToBack(stateRef.current, id));
  }, [handleStateChange]);

  const handleMoveForward = useCallback((id: string) => {
    handleStateChange(moveForward(stateRef.current, id));
  }, [handleStateChange]);

  const handleMoveBackward = useCallback((id: string) => {
    handleStateChange(moveBackward(stateRef.current, id));
  }, [handleStateChange]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <LayerToolbar
          activeLayer={stateRef.current.activeLayer}
          onChange={handleLayerChange}
        />
        <div style={{ paddingTop: 38 }}>
          <MapCanvas
            stateRef={stateRef}
            onStateChange={handleStateChange}
            draggingImage={draggingImage}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>
      <ImageLibrary onDragStart={setDraggingImage} />

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


