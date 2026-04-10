export function ChromeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z" fill="none"/>
      <path d="M24 4c5.2 0 9.9 2 13.4 5.3L24 24 11.5 8.5A19.9 19.9 0 0124 4z" fill="#EA4335"/>
      <path d="M37.4 9.3A19.9 19.9 0 0144 24c0 5.2-2 9.9-5.3 13.4L24 24l13.4-14.7z" fill="#FBBC05"/>
      <path d="M38.7 37.4A19.9 19.9 0 0124 44c-5.2 0-9.9-2-13.4-5.3L24 24l14.7 13.4z" fill="#34A853"/>
      <path d="M10.6 38.7A19.9 19.9 0 014 24c0-5.2 2-9.9 5.3-13.4L24 24 10.6 38.7z" fill="#4285F4"/>
      <circle cx="24" cy="24" r="8" fill="#4285F4"/>
      <circle cx="24" cy="24" r="5.5" fill="white"/>
      <circle cx="24" cy="24" r="5.5" fill="#4285F4"/>
    </svg>
  );
}
