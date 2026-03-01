// Shared types for images passed between components
export interface ImageRecord {
  id: number;
  filename: string;
  original: string;
  mimetype: string;
  size: number;
  created_at: string;
  url: string;
}
