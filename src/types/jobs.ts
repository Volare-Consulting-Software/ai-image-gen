// Strongly-typed payloads stored on Job.payload (Json), keyed by Job.type.
export interface ClarifyPayload {
  prompt: string;
}

export interface GeneratePayload {
  prompt: string;
}

export interface GeminiEditPayload {
  sourceImageId: string;
  instruction: string;
}

export interface ClaudeRefinePayload {
  sourceImageId: string;
  instructions: string;
  // True for the automatic first pass on entering the Claude stage.
  auto: boolean;
}
