import React, { useState } from 'react';
import { MapCanvas, PlacedImage } from './renderer/MapCanvas';
import { ImageLibrary } from './ui/ImageLibrary';
import { ImageRecord } from './types/images';

export function App() {
  const [placedImages, setPlacedImages] = useState<PlacedImage[]>([]);
  const [draggingImage, setDraggingImage] = useState<ImageRecord | null>(null);

  const handlePlace = (placed: PlacedImage) => {
    setPlacedImages(prev => {
      // Replace any image already on that cell
      const filtered = prev.filter(p => !(p.col === placed.col && p.row === placed.row));
      return [...filtered, placed];
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <ImageLibrary onDragStart={setDraggingImage} />
      <MapCanvas
        placedImages={placedImages}
        onPlace={handlePlace}
        draggingImage={draggingImage}
      />
    </div>
  );
}
