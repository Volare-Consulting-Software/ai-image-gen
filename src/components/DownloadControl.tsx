"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const RASTER_FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];
const SVG_FORMAT = { value: "svg", label: "SVG" };

const SIZES = [
  { value: "xs", label: "X-Small · 32px" },
  { value: "s", label: "Small · 128px" },
  { value: "m", label: "Medium · 512px" },
  { value: "l", label: "Large · 2048px" },
  { value: "xl", label: "X-Large · 4096px" },
];

// Pre-filled into the refine box when an SVG trace can't capture a shape — it
// steers the next pass toward flat, vectorizable artwork.
const SVG_REFINE_HINT =
  "Simplify this into clean, flat-colored shapes with crisp edges and a limited " +
  "color palette so it can be captured as an SVG vector.";

const selectCls =
  "rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent";

export function DownloadControl({
  projectId,
  imageId,
  transparentBgAvailable,
}: {
  projectId: string;
  imageId: string;
  transparentBgAvailable: boolean;
}) {
  const router = useRouter();
  const [format, setFormat] = useState("png");
  const [size, setSize] = useState("l");
  // SVG is offered up front and only removed once a trace attempt fails for this
  // image — at which point we steer the user toward a refine.
  const [svgLocked, setSvgLocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [refinePending, startRefine] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const formats = svgLocked ? RASTER_FORMATS : [...RASTER_FORMATS, SVG_FORMAT];
  const isSvg = format === "svg";

  async function download() {
    setDownloading(true);
    try {
      const href = `/api/images/${imageId}/download?format=${format}${isSvg ? "" : `&size=${size}`}`;
      const res = await fetch(href);
      if (!res.ok) {
        if (isSvg) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setSvgLocked(true);
          setFormat("png");
          setToast(body?.error ?? "SVG isn't available for this image. Refine it first, then try again.");
        } else {
          setToast("Download failed. Please try again.");
        }
        return;
      }
      const blob = await res.blob();
      const ext = isSvg ? "svg" : format === "jpeg" ? "jpg" : format;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `ai-image-${imageId}${isSvg ? "" : `-${size}`}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } finally {
      setDownloading(false);
    }
  }

  // Re-enter refinement with the SVG hint pre-filled so the user can produce a
  // vectorizable image, then come back and export SVG.
  function refineForSvg() {
    startRefine(async () => {
      await fetch(`/api/projects/${projectId}/pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      router.push(`/projects/${projectId}?refine=${encodeURIComponent(SVG_REFINE_HINT)}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectCls}>
            {formats.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        {!isSvg && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Size</span>
            <select value={size} onChange={(e) => setSize(e.target.value)} className={selectCls}>
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download"}
        </button>

        {format === "png" && transparentBgAvailable && (
          <span className="text-xs text-text-muted">Background will be made transparent</span>
        )}
        {isSvg && <span className="text-xs text-text-muted">Vector · scales to any size</span>}
      </div>

      {svgLocked && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-xs text-text-secondary">
            SVG is locked for this image. Refine it for cleaner shapes to unlock it.
          </span>
          <button
            type="button"
            onClick={refineForSvg}
            disabled={refinePending}
            className="text-xs font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-50"
          >
            {refinePending ? "…" : "Refine for an SVG shape"}
          </button>
        </div>
      )}

      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-[var(--error)] bg-surface px-4 py-3 text-sm text-error shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
