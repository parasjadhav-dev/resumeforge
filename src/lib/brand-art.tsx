/**
 * The ResumeForge mark as plain SVG, for places that render images on the server
 * (favicon, Apple icon, share image). Mirrors components/brand/logo.tsx.
 */
export function BrandMarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#g)" />
      <path
        d="M10 6.5h8.2L23.5 12v13a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 25V8A1.5 1.5 0 0 1 10 6.5Z"
        fill="#ffffff"
      />
      <path d="M18.2 6.5V12h5.3Z" fill="#c7d2fe" />
      <rect x="11.5" y="15" width="9" height="1.6" rx="0.8" fill="#6366f1" />
      <rect x="11.5" y="18.4" width="9" height="1.6" rx="0.8" fill="#a5b4fc" />
      <rect x="11.5" y="21.8" width="5.5" height="1.6" rx="0.8" fill="#a5b4fc" />
    </svg>
  );
}
