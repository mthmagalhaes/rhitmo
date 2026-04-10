export function SlackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top-left (teal) */}
      <path d="M14 4a4 4 0 00-4 4v4h4a4 4 0 000-8z" fill="#36C5F0"/>
      <rect x="4" y="16" width="8" height="16" rx="4" fill="#36C5F0"/>
      {/* Top-right (pink) */}
      <path d="M44 14a4 4 0 00-4-4h-4v4a4 4 0 008 0z" fill="#E01E5A"/>
      <rect x="16" y="4" width="16" height="8" rx="4" fill="#E01E5A"/>
      {/* Bottom-right (yellow) */}
      <path d="M34 44a4 4 0 004-4v-4h-4a4 4 0 000 8z" fill="#ECB22E"/>
      <rect x="36" y="16" width="8" height="16" rx="4" fill="#ECB22E"/>
      {/* Bottom-left (green) */}
      <path d="M4 34a4 4 0 004 4h4v-4a4 4 0 00-8 0z" fill="#2EB67D"/>
      <rect x="16" y="36" width="16" height="8" rx="4" fill="#2EB67D"/>
      {/* Center connectors */}
      <rect x="16" y="16" width="16" height="8" rx="0" fill="#E01E5A" opacity="0.9"/>
      <rect x="16" y="24" width="16" height="8" rx="0" fill="#2EB67D" opacity="0.9"/>
      <rect x="16" y="16" width="8" height="16" rx="0" fill="#36C5F0" opacity="0.9"/>
      <rect x="24" y="16" width="8" height="16" rx="0" fill="#ECB22E" opacity="0.9"/>
    </svg>
  );
}
