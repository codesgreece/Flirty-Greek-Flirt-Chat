export function FlirtyLogo({ className = "h-10 w-10", title = "FLIRTY" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="fPink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8ab8" />
          <stop offset="100%" stopColor="#ff3d8a" />
        </linearGradient>
        <linearGradient id="fBlue" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="#0c0716" stroke="rgba(255,255,255,0.08)" />
      <path
        d="M28 22c-6 1-10 8-9 15 1 8 8 14 16 22 2 2 4 4 5 5 1-1 3-3 5-5 8-8 15-14 16-22 1-7-3-14-9-15-5-1-9 2-12 7-3-5-7-8-12-7z"
        fill="none"
        stroke="url(#fPink)"
        strokeWidth="2.2"
        opacity="0.35"
      />
      <path
        d="M24 28c0-6 4-11 10-11 4 0 7 2 8 6 2 7-1 13-8 20-3 3-5 5-6 6"
        fill="none"
        stroke="url(#fPink)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M56 28c0-6-4-11-10-11-4 0-7 2-8 6-2 7 1 13 8 20 3 3 5 5 6 6"
        fill="none"
        stroke="url(#fBlue)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="27" cy="24" r="3.1" fill="url(#fPink)" />
      <circle cx="53" cy="24" r="3.1" fill="url(#fBlue)" />
      <text x="22.5" y="21.5" fontSize="8" fill="#ff3d8a">♀</text>
      <text x="52.5" y="21.5" fontSize="8" fill="#818cf8">♂</text>
      <path d="M40 44c1.4-2.8 6-2.6 6 .8 0 3.2-6 6.4-6 6.4s-6-3.2-6-6.4c0-3.4 4.6-3.6 6-.8z" fill="#ff3d8a" />
    </svg>
  );
}

export function FlirtyWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FlirtyLogo className="h-9 w-9" />
      <div>
        <p className="text-xl font-extrabold tracking-tight">
          FLIRT<span className="text-flirty-pink">Y</span>
        </p>
        <p className="-mt-1 text-[10px] uppercase tracking-[0.22em] text-white/50">Meet • Flirt • Belong</p>
      </div>
    </div>
  );
}
