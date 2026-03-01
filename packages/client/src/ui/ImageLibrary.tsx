import React, { useEffect, useRef, useState } from 'react';
import { ImageRecord } from '../types/images';

const API = 'http://localhost:3001';

interface Props {
  onDragStart: (img: ImageRecord) => void;
}

export function ImageLibrary({ onDragStart }: Props) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    const res = await fetch(`${API}/api/images`);
    const data = await res.json();
    setImages(data);
  };

  useEffect(() => { fetchImages(); }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
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

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Images</span>
        <button style={styles.uploadBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? '...' : '+ Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div style={styles.list}>
        {images.length === 0 && (
          <p style={styles.empty}>No images yet.<br />Upload one to get started.</p>
        )}
        {images.map(img => (
          <div
            key={img.id}
            style={styles.item}
            title={img.original}
            draggable
            onDragStart={() => onDragStart(img)}
          >
            <img
              src={`${API}${img.url}`}
              alt={img.original}
              style={styles.thumb}
              draggable={false}
            />
            <span style={styles.label}>{img.original}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 200,
    minWidth: 200,
    height: '100vh',
    background: '#12122a',
    borderLeft: '1px solid #2a2a4a',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid #2a2a4a',
    flexShrink: 0,
  },
  title: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  uploadBtn: {
    background: '#3a3a6a',
    color: '#ccc',
    border: 'none',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 6px',
    borderRadius: 4,
    background: '#1e1e3a',
    cursor: 'grab',
    border: '1px solid transparent',
  },
  thumb: {
    width: 36,
    height: 36,
    objectFit: 'cover',
    borderRadius: 3,
    flexShrink: 0,
    background: '#2a2a4a',
  },
  label: {
    color: '#bbb',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empty: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 1.6,
  },
};
