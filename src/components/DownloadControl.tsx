"use client";

import { useState } from "react";

const RASTER_FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

const SIZES = [
  { value: "xs", label: "X-Small · 32px" },
  { value: "s", label: "Small · 128px" },
  { value: "m", label: "Medium · 512px" },
  { value: "l", label: "Large · 2048px" },
  { value: "xl", label: "X-Large · 4096px" },
];

const selectCls =
  "rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent";

export function DownloadControl({
  imageId,
  shapeAvailable,
  transparentBgAvailable,
}: {
  imageId: string;
  shapeAvailable: boolean;
  transparentBgAvailable: boolean;
}) {
  const [format, setFormat] = useState("png");
  const [size, setSize] = useState("l");

  const formats = shapeAvailable ? [...RASTER_FORMATS, { value: "svg", label: "SVG" }] : RASTER_FORMATS;
  const isSvg = format === "svg";
  const href = `/api/images/${imageId}/download?format=${format}${isSvg ? "" : `&size=${size}`}`;

  return (
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

      <a
        href={href}
        download
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover"
      >
        Download
      </a>

      {format === "png" && transparentBgAvailable && (
        <span className="text-xs text-text-muted">Background will be made transparent</span>
      )}
      {isSvg && <span className="text-xs text-text-muted">Vector · scales to any size</span>}
    </div>
  );
}
