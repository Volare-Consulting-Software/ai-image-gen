// A candidate offered in a CHOOSING gate.
export interface ChooseCandidate {
  imageId: string;
}

// An entry in a gate's append-only feedback log.
export interface FeedbackEntry {
  comment: string;
  submittedAt: string;
}

// Actions the client can send to resolve each kind of gate.
export type ChooseAction = "as_is" | "with_suggestions" | "try_again";
export type GeminiRefineAction = "happy" | "more";
export type ClaudeRefineAction = "done" | "refine";
