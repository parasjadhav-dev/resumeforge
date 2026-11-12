/**
 * The ResumeForge mark, drawn once. Used by the site logo and by the images generated on the
 * server (favicon, Apple icon, share image), so they always match.
 *
 * Flat colours only: a deep navy tile, a sheet of paper, and a single copper line.
 */
export const BRAND = {
  navy: "#1a3453",
  paper: "#fffdfa",
  fold: "#d8d0c3",
  copper: "#a34d16",
  muted: "#a2afc1",
  /** A lighter copper that reads well on the navy background of the share image. */
  copperOnNavy: "#ec9c63",
  sand: "#e4ddcf",
} as const;

export function BrandMarkSvg({
  size,
  className,
  decorative = false,
}: {
  /** Pixel size, for server-rendered images. Omit when sizing with CSS classes. */
  size?: number;
  className?: string;
  /** True when the name is already shown next to it, so screen readers skip the image. */
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "ResumeForge" })}
    >
      <rect width="32" height="32" rx="6" fill={BRAND.navy} />
      <path
        d="M10 6.5h8.2L23.5 12v13a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 25V8A1.5 1.5 0 0 1 10 6.5Z"
        fill={BRAND.paper}
      />
      <path d="M18.2 6.5V12h5.3Z" fill={BRAND.fold} />
      <rect x="11.5" y="15" width="9" height="1.6" rx="0.8" fill={BRAND.copper} />
      <rect x="11.5" y="18.4" width="9" height="1.6" rx="0.8" fill={BRAND.muted} />
      <rect x="11.5" y="21.8" width="5.5" height="1.6" rx="0.8" fill={BRAND.muted} />
    </svg>
  );
}
