/**
 * Official Google Calendar icon (2020+ flat design).
 *
 * Faithful reconstruction of the official Google Workspace asset:
 *  - Top blue band (#4285F4)
 *  - Right yellow band (#FBBC04)
 *  - Bottom green band (#34A853)
 *  - Bottom-right red "page fold" (#EA4335)
 *  - White center card with bold "31" in Google blue (#1A73E8)
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
    <path d="M4 8a2 2 0 0 1 2-2h36a2 2 0 0 1 2 2v8H4V8z" fill="#4285F4" />

    {/* Right yellow band */}
    <path d="M36 16h8v20h-8V16z" fill="#FBBC04" />

    {/* Bottom green band */}
    <path d="M4 36h32v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6z" fill="#34A853" />

    {/* Left white extension to complete the paper area */}
    <path d="M4 16h8v20H4V16z" fill="#FFFFFF" />

    {/* White center card */}
    <rect x="12" y="16" width="24" height="20" fill="#FFFFFF" />

    {/* Red "page fold" at the bottom-right corner */}
    <path d="M36 36h8l-8 8v-8z" fill="#EA4335" />

    {/* "31" in Google Blue, bold, centered in the white card */}
    <text
      x="24"
      y="30"
      textAnchor="middle"
      fontFamily="'Google Sans', 'Product Sans', 'Roboto', Arial, system-ui, sans-serif"
      fontSize="16"
      fontWeight="900"
      fill="#1A73E8"
      dominantBaseline="middle"
      letterSpacing="-1"
    >
      31
    </text>
  </svg>
);
