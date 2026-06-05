// Distinct marks for each AI provider (server-safe inline SVG).

export function GeminiMark({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} text-blue-600`} fill="currentColor" aria-label="Gemini">
      <path d="M12 2c.5 4.5 3 7 7.5 7.5C15 10 12.5 12.5 12 17c-.5-4.5-3-7-7.5-7.5C9 9.5 11.5 7 12 2z" />
    </svg>
  );
}

export function ClaudeMark({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} text-orange-600`}
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      aria-label="Claude"
    >
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
      <line x1="18.4" y1="5.6" x2="5.6" y2="18.4" />
    </svg>
  );
}
