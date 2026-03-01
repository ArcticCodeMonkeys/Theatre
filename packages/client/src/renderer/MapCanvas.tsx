import React, { useEffect, useRef } from 'react';
import { ImageRecord } from '../types/images';

const CELL_SIZE = 64;
const API = 'http://localhost:3001';

export interface PlacedImage {
  img: ImageRecord;
  col: number;   // grid column (0-indexed)
  row: number;   // grid row (0-indexed)
  htmlImg: HTMLImageElement;
}

interface Props {
  placedImages: PlacedImage[];
  onPlace: (placed: PlacedImage) => void;
  draggingImage: ImageRecord | null;
}

export function MapCanvas({ placedImages, onPlace, draggingImage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep a ref to placedImages so the draw callback always sees latest
  const placedRef = useRef<PlacedImage[]>(placedImages);
  placedRef.current = placedImages;

  // Draw everything
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Placed images (drawn before grid so grid lines appear on top)
    for (const p of placedRef.current) {
      const x = p.col * CELL_SIZE;
      const y = p.row * CELL_SIZE;
      ctx.drawImage(p.htmlImg, x, y, CELL_SIZE, CELL_SIZE);
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(180, 180, 220, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += CELL_SIZE) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += CELL_SIZE) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  };

  // Initial setup + resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth - 200; // subtract sidebar width
      canvas.height = window.innerHeight;
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Redraw whenever placed images change
  useEffect(() => { draw(); }, [placedImages]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingImage) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    const htmlImg = new Image();
    htmlImg.onload = () => {
      onPlace({ img: draggingImage, col, row, htmlImg });
    };
    htmlImg.src = `${API}${draggingImage.url}`;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}

