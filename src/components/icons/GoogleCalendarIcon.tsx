/**
 * Official Google Calendar icon (2020+ flat design).
 * Optimized for small UI sizes (16-24px) — keeps the four corner color chips
 * and a bold "31" centered, mirroring the Google Workspace brand asset.
 *
 * Brand colors used directly (not theme tokens) to preserve brand integrity,
 * matching the SlackIcon pattern.
 */
export const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Google Calendar"
  >
    {/* White paper background */}
    <rect x="6" y="6" width="36" height="36" rx="2" fill="#FFFFFF" />

    {/* Corner color chips (official Google brand colors) */}
    {/* Top-left blue */}
    <path d="M6 8a2 2 0 0 1 2-2h6v6H6V8z" fill="#4285F4" />
    {/* Top-right red */}
    <path d="M34 6h6a2 2 0 0 1 2 2v6h-8V6z" fill="#EA4335" />
    {/* Bottom-right yellow */}
    <path d="M34 34h8v6a2 2 0 0 1-2 2h-6v-8z" fill="#FBBC04" />
    {/* Bottom-left green */}
    <path d="M6 34h8v8H8a2 2 0 0 1-2-2v-6z" fill="#34A853" />

    {/* "31" in Google Blue, bold, centered in the white area */}
    <text
      x="24"
      y="30"
      textAnchor="middle"
      fontFamily="'Google Sans', 'Product Sans', 'Roboto', system-ui, sans-serif"
      fontSize="16"
      fontWeight="700"
      fill="#1A73E8"
      dominantBaseline="middle"
    >
      31
    </text>
  </svg>
);
