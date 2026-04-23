/**
 * Flat, scout-manual style campsite scene (thick outlines, simple shapes).
 * Pure SVG — no external assets.
 */
export function CampCrestIllustration({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full select-none ${compact ? "max-w-md" : "max-w-xl"} ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 480 200"
        className={`h-auto w-full ${compact ? "max-h-[7.5rem]" : "max-h-[11rem] sm:max-h-[12.5rem]"}`}
        focusable="false"
      >
        {/* Sky */}
        <path
          fill="#c8e4dc"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinejoin="round"
          d="M 8 42 Q 120 18 240 28 T 472 40 L 472 198 L 8 198 Z"
        />
        {/* Far hills */}
        <path
          fill="#6a9e8f"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinejoin="round"
          d="M -4 168 Q 80 95 160 118 Q 220 88 280 115 Q 360 78 490 125 L 490 200 L -4 200 Z"
        />
        {/* Near hill */}
        <path
          fill="#4d826f"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinejoin="round"
          d="M -8 200 Q 100 130 200 148 Q 280 125 360 142 Q 420 128 492 158 L 492 200 Z"
        />
        {/* Storybook cloud */}
        <path
          fill="#fdf6e3"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinejoin="round"
          d="M 24 58 Q 18 48 32 44 Q 46 38 58 44 Q 72 36 84 50 Q 92 56 86 68 Q 72 78 48 74 Q 26 76 24 58 Z"
        />
        {/* Sun */}
        <circle
          cx="418"
          cy="52"
          r="20"
          fill="#f4d37a"
          stroke="#2f4152"
          strokeWidth="3"
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = 28;
          const x1 = 418 + Math.cos((deg * Math.PI) / 180) * r;
          const y1 = 52 + Math.sin((deg * Math.PI) / 180) * r;
          const x2 = 418 + Math.cos((deg * Math.PI) / 180) * (r + 12);
          const y2 = 52 + Math.sin((deg * Math.PI) / 180) * (r + 12);
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#2f4152"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
        {/* Pine trees */}
        {[
          { x: 95, s: 1 },
          { x: 135, s: 0.85 },
          { x: 345, s: 0.95 },
          { x: 385, s: 0.75 },
        ].map(({ x, s }, i) => (
          <g key={i} transform={`translate(${x}, 118) scale(${s})`}>
            <path
              fill="#33544c"
              stroke="#2f4152"
              strokeWidth="3"
              strokeLinejoin="round"
              d="M 0 -58 L 22 8 L -22 8 Z M 0 -38 L 18 8 L -18 8 Z"
            />
            <rect x="-5" y="8" width="10" height="22" rx="2" fill="#5c3d2a" stroke="#2f4152" strokeWidth="3" />
          </g>
        ))}
        {/* Tent */}
        <g transform="translate(240, 128)">
          <path
            d="M -52 40 L 0 -38 L 52 40 Z"
            fill="#e8a882"
            stroke="#2f4152"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M -8 40 L 0 -10 L 8 40 Z"
            fill="#fdf6e3"
            stroke="#2f4152"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M -52 40 Q 0 28 52 40"
            fill="none"
            stroke="#2f4152"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        {/* Tiny pennant */}
        <path
          d="M 300 78 L 332 62 L 332 94 Z"
          fill="#c45c3e"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <line
          x1="300"
          y1="78"
          x2="300"
          y2="118"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Birds (Junior Woodchucks / storybook) */}
        <path
          d="M 170 52 L 182 46 M 182 46 L 194 52"
          fill="none"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 200 38 L 212 32 M 212 32 L 224 38"
          fill="none"
          stroke="#2f4152"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
