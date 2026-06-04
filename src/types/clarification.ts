// A single high-impact clarifying question about a vague prompt.
export interface ClarifyingQuestion {
  question: string;
  // Why this question materially changes the resulting image.
  why: string;
  // Optional suggested answers the user can pick from.
  options?: string[];
}

export interface ClarificationResult {
  // Whether the prompt is vague enough to warrant questions.
  isVague: boolean;
  // Up to a few questions; empty when the prompt is already clear.
  questions: ClarifyingQuestion[];
}

// A user's answer to one clarifying question.
export interface ClarificationAnswer {
  question: string;
  answer: string;
}
