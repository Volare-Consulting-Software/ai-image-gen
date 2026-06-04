// Raw image produced by an engine, before it's persisted to storage/DB.
export interface GeneratedImage {
  data: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
}
