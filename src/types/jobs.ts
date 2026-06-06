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
  // Optional reference photo to send alongside the source for this edit.
  referenceImageId?: string;
}

export interface ClaudeRefinePayload {
  sourceImageId: string;
  // The user's polish instructions, or "" for the automatic pass. The system
  // clean-up brief is appended at run time; only this part is shown in the UI.
  userInstructions: string;
}
