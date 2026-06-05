// Token usage + cost for the call that produced an image.
export interface ImageUsage {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

// Raw image produced by an engine, before it's persisted to storage/DB.
export interface GeneratedImage {
  data: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  usage?: ImageUsage;
}
