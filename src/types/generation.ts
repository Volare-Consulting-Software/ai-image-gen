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

// A user-uploaded reference photo passed alongside a prompt to influence the
// generated result.
export interface ReferenceImage {
  data: Buffer;
  mimeType: string;
}

// Thrown when an image model call completes but returns no image (e.g. a refusal
// or text-only reply). Carries the call's usage so the (still-billed) tokens and
// cost are recorded, plus the structured reason code and any text the model
// returned, so the failure can be shown to the user in a friendly way.
export class NoImageError extends Error {
  constructor(
    message: string,
    readonly usage?: ImageUsage,
    // Raw Gemini finish/block reason code, e.g. "IMAGE_RECITATION".
    readonly reason?: string,
    // Any text the model returned instead of an image (a refusal/explanation).
    readonly modelText?: string,
  ) {
    super(message);
    this.name = "NoImageError";
  }
}

// Thrown when a Gemini API call fails at the transport level (the SDK's
// ApiError) — rate limits, auth, invalid request, server errors, etc. Carries
// the HTTP status so the failure can be shown to the user in a friendly way.
export class GeminiApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}
