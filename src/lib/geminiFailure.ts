// Human-readable explanations for Gemini finish/block reason codes, so an
// "AI error" can be shown to users instead of a raw enum like IMAGE_RECITATION.
// Covers the full FinishReason and BlockedReason enums from @google/genai.
const REASONS: Record<string, string> = {
  // Unspecified / generic
  FINISH_REASON_UNSPECIFIED: "The model stopped for an unspecified reason.",
  BLOCKED_REASON_UNSPECIFIED: "The request was blocked for an unspecified reason.",
  OTHER: "The model stopped for an unspecified reason.",
  IMAGE_OTHER: "Image generation stopped for an unspecified reason.",
  NO_IMAGE: "The model didn't produce an image for this request.",

  // Length / format
  STOP: "The model finished without producing an image.",
  MAX_TOKENS: "The response hit its length limit before an image was produced.",
  LANGUAGE: "The request used a language the model doesn't support here.",
  MALFORMED_FUNCTION_CALL: "The model produced an invalid tool call instead of an image.",
  UNEXPECTED_TOOL_CALL: "The model produced an unexpected tool call instead of an image.",

  // Safety / policy (text + image variants)
  SAFETY: "Blocked by safety filters.",
  IMAGE_SAFETY: "The image was blocked by safety filters.",
  PROHIBITED_CONTENT: "Blocked for containing prohibited content.",
  IMAGE_PROHIBITED_CONTENT: "The image was blocked for prohibited content.",
  BLOCKLIST: "Blocked for containing terms on a blocklist.",
  SPII: "Blocked to protect sensitive personal information.",
  MODEL_ARMOR: "Blocked by content protection.",
  JAILBREAK: "Blocked as a suspected attempt to bypass safety rules.",

  // Recitation (copyright / memorized content)
  RECITATION: "Stopped to avoid reproducing copyrighted or memorized text.",
  IMAGE_RECITATION:
    "The image was blocked because it too closely reproduced existing (possibly copyrighted) content. Try a more original description or a different reference image.",
};

// HTTP statuses the @google/genai SDK throws as ApiError. Stored as "HTTP_<n>"
// in the failure reason so they share the same friendly path as finish reasons.
const STATUSES: Record<number, string> = {
  400: "Gemini rejected the request as invalid (the prompt or image may be unsupported).",
  401: "Gemini authentication failed — check the API key.",
  403: "Gemini denied access — the API key can't use this model.",
  404: "The requested Gemini model wasn't found.",
  408: "The request to Gemini timed out — try again.",
  413: "The request was too large for Gemini (try a smaller reference image).",
  422: "Gemini couldn't process the request as given.",
  429: "Gemini's rate limit or quota was exceeded — wait a moment and try again.",
  499: "The request to Gemini was cancelled.",
  500: "Gemini hit an internal error — try again.",
  502: "Gemini was temporarily unreachable — try again.",
  503: "Gemini is temporarily overloaded or unavailable — try again shortly.",
  504: "Gemini timed out — try again.",
};

function humanizeStatus(status: number): string {
  if (STATUSES[status]) return STATUSES[status];
  if (status >= 500) return "Gemini had a server error — try again.";
  if (status >= 400) return `Gemini rejected the request (HTTP ${status}).`;
  return `Gemini returned an unexpected response (HTTP ${status}).`;
}

// Turn a raw failure code into a friendly sentence. Handles both model finish/
// block reasons (e.g. "IMAGE_RECITATION") and API errors stored as "HTTP_429".
export function humanizeGeminiReason(code: string | null | undefined): string {
  if (!code) return "The model didn't return an image.";
  if (code.startsWith("HTTP_")) {
    const status = Number(code.slice(5));
    return Number.isFinite(status) ? humanizeStatus(status) : "Gemini returned an error.";
  }
  return REASONS[code] ?? `The model stopped early (${code}).`;
}
