import { ImageRecord } from '../types/images';

export type LayerName = 'map' | 'token';

export interface PlacedImage {
  id: string;
  layer: LayerName;
  img: ImageRecord;
  htmlImg: HTMLImageElement;
  col: number;
  row: number;
  wTiles: number;
  hTiles: number;
  rotation: number;
  sheetId?: number;
}

/** Network/DB-safe version — no HTMLImageElement. */
export type SerializedPlacedImage = Omit<PlacedImage, 'htmlImg'>;

const API = 'http://localhost:3001';

/** Hydrate a serialized token with a loaded HTMLImageElement. */
export function hydratePlacedImage(s: SerializedPlacedImage): Promise<PlacedImage> {
  return new Promise(resolve => {
    const htmlImg = new Image();
    htmlImg.onload = () => resolve({ ...s, htmlImg });
    htmlImg.onerror = () => resolve({ ...s, htmlImg }); // resolve even on error
    htmlImg.src = `${API}${s.img.url}`;
    if (htmlImg.complete) resolve({ ...s, htmlImg });
  });
}

/** Hydrate a full serialized canvas state. */
export async function hydrateState(raw: { mapLayer: SerializedPlacedImage[]; tokenLayer: SerializedPlacedImage[] }): Promise<Omit<CanvasState, 'selectedId' | 'activeLayer'>> {
  const [mapLayer, tokenLayer] = await Promise.all([
    Promise.all(raw.mapLayer.map(hydratePlacedImage)),
    Promise.all(raw.tokenLayer.map(hydratePlacedImage)),
  ]);
  return { mapLayer, tokenLayer };
}

/** Strip htmlImg so the state can be sent over the network. */
export function serializeState(state: CanvasState): { mapLayer: SerializedPlacedImage[]; tokenLayer: SerializedPlacedImage[] } {
  const strip = ({ htmlImg: _h, ...rest }: PlacedImage): SerializedPlacedImage => rest;
  return {
    mapLayer: state.mapLayer.map(strip),
    tokenLayer: state.tokenLayer.map(strip),
  };
}


export interface CanvasState {
  mapLayer: PlacedImage[];
  tokenLayer: PlacedImage[];
  selectedId: string | null;
  activeLayer: LayerName;
}

export function getLayer(state: CanvasState, layer: LayerName): PlacedImage[] {
  return layer === 'map' ? state.mapLayer : state.tokenLayer;
}

export function setLayer(state: CanvasState, layer: LayerName, items: PlacedImage[]): CanvasState {
  return layer === 'map'
    ? { ...state, mapLayer: items }
    : { ...state, tokenLayer: items };
}

export function allImages(state: CanvasState): PlacedImage[] {
  return [...state.mapLayer, ...state.tokenLayer];
}

// ─── Z-order helpers (operate on the layer that contains the id) ──────────────

function reorderLayer(layer: PlacedImage[], id: string, fn: (arr: PlacedImage[], idx: number) => PlacedImage[]): PlacedImage[] {
  const idx = layer.findIndex(p => p.id === id);
  if (idx === -1) return layer;
  return fn([...layer], idx);
}

export function moveToFront(state: CanvasState, id: string): CanvasState {
  const move = (layer: PlacedImage[]) => reorderLayer(layer, id, (arr, i) => { const [item] = arr.splice(i, 1); arr.push(item); return arr; });
  return { ...state, mapLayer: move(state.mapLayer), tokenLayer: move(state.tokenLayer) };
}

export function moveToBack(state: CanvasState, id: string): CanvasState {
  const move = (layer: PlacedImage[]) => reorderLayer(layer, id, (arr, i) => { const [item] = arr.splice(i, 1); arr.unshift(item); return arr; });
  return { ...state, mapLayer: move(state.mapLayer), tokenLayer: move(state.tokenLayer) };
}

export function moveForward(state: CanvasState, id: string): CanvasState {
  const move = (layer: PlacedImage[]) => reorderLayer(layer, id, (arr, i) => {
    if (i < arr.length - 1) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
    return arr;
  });
  return { ...state, mapLayer: move(state.mapLayer), tokenLayer: move(state.tokenLayer) };
}

export function moveBackward(state: CanvasState, id: string): CanvasState {
  const move = (layer: PlacedImage[]) => reorderLayer(layer, id, (arr, i) => {
    if (i > 0) { [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; }
    return arr;
  });
  return { ...state, mapLayer: move(state.mapLayer), tokenLayer: move(state.tokenLayer) };
}
