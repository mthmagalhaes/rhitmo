/**
 * Official Google Calendar icon (2020+ flat design).
 *
 * Reconstruction of the official Google Workspace asset:
 *  - Top band: blue (#4285F4)
 *  - Right band: yellow (#FBBC04)
 *  - Bottom band: green (#34A853)
 *  - Bottom-right "page fold": red (#EA4335) overlapping the corner
 *  - Center: white card with bold "31" in Google blue (#1A73E8)
 *
 * Brand colors used directly (not theme tokens) to preserve brand integrity,
 * matching the SlackIcon pattern. Optimized for 16–24px UI sizes.
 */
export const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Google Calendar"
  >
    {/* Top blue band */}
    <path d="M4 8a2 2 0 0 1 2-2h36a2 2 0 0 1 2 2v6H4V8z" fill="#4285F4" />

    {/* Right yellow band */}
    <path d="M36 14h8v22h-8V14z" fill="#FBBC04" />

    {/* Bottom green band */}
    <path d="M4 36h32v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6z" fill="#34A853" />

    {/* Left white extension (paper area) */}
    <path d="M4 14h8v22H4V14z" fill="#FFFFFF" />

    {/* White center card */}
    <rect x="12" y="14" width="24" height="22" fill="#FFFFFF" />

    {/* Red "page fold" at the bottom-right corner */}
    <path d="M36 36h8l-8 8v-8z" fill="#EA4335" />
    {/* Green sliver beneath the fold to match official asset */}
    <path d="M36 36v8h-2a2 2 0 0 1-2-2v-6h4z" fill="#188038" opacity="0" />

    {/* "31" in Google Blue, bold, centered in the white card */}
    <text
      x="24"
      y="30"
      textAnchor="middle"
      fontFamily="'Google Sans', 'Product Sans', 'Roboto', system-ui, -apple-system, sans-serif"
      fontSize="15"
      fontWeight="800"
      fill="#1A73E8"
      dominantBaseline="middle"
      letterSpacing="-0.5"
    >
      31
    </text>
  </svg>
);
