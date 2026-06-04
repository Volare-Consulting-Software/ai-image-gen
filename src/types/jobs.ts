// Strongly-typed payloads stored on Job.payload (Json), keyed by Job.type.
export interface ClarifyPayload {
  prompt: string;
}

import type { ClarificationAnswer } from "@/types/clarification";

export interface GeneratePayload {
  // A ready-to-use prompt (non-vague path, or "try again"). When absent, the
  // generate job synthesizes one from `original` + `answers` first.
  prompt?: string;
  original?: string;
  answers?: ClarificationAnswer[];
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
