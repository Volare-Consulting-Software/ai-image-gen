"use client";

import { useState } from "react";

// Shown while a polish step is handed off. Displays the paste-ready brief for any
// Claude session and waits (the page polls) until the result is posted back.
export function HandoffBrief({ brief, sourceUrl }: { brief: string; sourceUrl: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-sm font-semibold">Polish handed off — waiting for the result…</span>
      </div>
      <p className="text-sm text-text-secondary">
        Paste this into any Claude Code session. It will fetch the image, refine it, and post the
        result back — then this page continues automatically.
      </p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-sunken p-3 text-xs text-text-primary">
        {brief}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(brief);
            setCopied(true);
          }}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-hover"
        >
          {copied ? "Copied" : "Copy brief"}
        </button>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-sunken"
        >
          View source image
        </a>
      </div>
    </div>
  );
}
