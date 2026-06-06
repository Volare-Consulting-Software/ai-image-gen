// App logo: a magic-wand mark in the company accent color (a nod to the
// "turn a prompt into magic" idea), replacing the generic company logo. White
// wand on an accent-purple rounded badge so it reads as a branded app icon.
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-md bg-accent text-accent-on ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        {/* wand handle */}
        <path d="M4.5 19.5 L13 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* large sparkle at the tip */}
        <path
          d="M16 5 c0.45 1.85 1.15 2.55 3 3 -1.85 0.45 -2.55 1.15 -3 3 -0.45 -1.85 -1.15 -2.55 -3 -3 1.85 -0.45 2.55 -1.15 3 -3Z"
          fill="currentColor"
        />
        {/* small sparkles */}
        <path
          d="M6.5 4.5 c0.25 1 0.6 1.35 1.6 1.6 -1 0.25 -1.35 0.6 -1.6 1.6 -0.25 -1 -0.6 -1.35 -1.6 -1.6 1 -0.25 1.35 -0.6 1.6 -1.6Z"
          fill="currentColor"
        />
        <path
          d="M19 13 c0.2 0.85 0.5 1.15 1.35 1.35 -0.85 0.2 -1.15 0.5 -1.35 1.35 -0.2 -0.85 -0.5 -1.15 -1.35 -1.35 0.85 -0.2 1.15 -0.5 1.35 -1.35Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
