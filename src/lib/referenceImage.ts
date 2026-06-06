// Shared constants/helpers for the optional reference-image feature: a user can
// attach one photo to a Gemini prompt to influence the result.

// The canonical phrase an "(Image Reference)" chip serializes to in a prompt.
// Kept here as the single source of truth so the client editor and any server
// use never drift. The actual photo is sent to Gemini only when this phrase
// (i.e. the chip) is present in the submitted prompt.
export const REFERENCE_CHIP_PHRASE = "the attached reference image";

// Accepted upload types and size cap for reference photos.
export const REFERENCE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const REFERENCE_IMAGE_MAX_BYTES =
  Number(process.env.REFERENCE_IMAGE_MAX_BYTES) || 8 * 1024 * 1024;

// File extension for an image MIME type, used when keying objects in storage.
export function extForMime(mimeType: string): string {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}
