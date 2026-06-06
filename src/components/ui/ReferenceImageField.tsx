"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import type { PromptEditorHandle } from "@/components/ui/PromptEditor";
import { REFERENCE_IMAGE_MAX_BYTES, REFERENCE_IMAGE_MIME_TYPES } from "@/lib/referenceImage";

interface ReferenceImageFieldProps {
  // The prompt editor to insert/remove the "(Image Reference)" chip into.
  editorRef: RefObject<PromptEditorHandle | null>;
  // Reports the uploaded reference id (or null when none/removed) so the parent
  // can include it on submit — but only when a chip is present.
  onReferenceChange: (id: string | null) => void;
  disabled?: boolean;
}

const ACCEPT = REFERENCE_IMAGE_MIME_TYPES.join(",");

// Optional "Include Reference Image" control: upload one photo, preview it,
// remove it, and insert the inline reference chip into the prompt. The photo is
// only sent to Gemini when the chip is present at submit time.
export function ReferenceImageField({
  editorRef,
  onReferenceChange,
  disabled = false,
}: ReferenceImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReference, setHasReference] = useState(false);

  // Revoke the object URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onFileSelected(file: File) {
    setError(null);
    if (!(REFERENCE_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > REFERENCE_IMAGE_MAX_BYTES) {
      setError(`Image is too large (max ${Math.round(REFERENCE_IMAGE_MAX_BYTES / (1024 * 1024))} MB).`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/reference-images", { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      const { id } = (await res.json()) as { id: string };
      onReferenceChange(id);
      setHasReference(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
      onReferenceChange(null);
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    editorRef.current?.removeChip();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setHasReference(false);
    setError(null);
    onReferenceChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFileSelected(file);
        }}
      />

      {!hasReference ? (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Include Reference Image"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-base p-2">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="reference"
              className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => editorRef.current?.insertChip()}
            >
              Add to prompt
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={remove}>
              Remove
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
