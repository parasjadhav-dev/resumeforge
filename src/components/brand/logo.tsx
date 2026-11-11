import Link from "next/link";
import { cn } from "@/lib/utils";

/** The ResumeForge mark: a document on an indigo-to-violet tile. Also drawn in app/icon.tsx. */
export function LogoMark({
  className,
  decorative = false,
}: {
  className?: string;
  /** True when the name is already shown next to it, so screen readers skip the image. */
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "ResumeForge" })}
    >
      <defs>
        <linearGradient id="rf-logo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#rf-logo-tile)" />
      <path
        d="M10 6.5h8.2L23.5 12v13a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 25V8A1.5 1.5 0 0 1 10 6.5Z"
        fill="#fff"
      />
      <path d="M18.2 6.5V12h5.3Z" fill="#c7d2fe" />
      <rect x="11.5" y="15" width="9" height="1.6" rx=".8" fill="#6366f1" />
      <rect x="11.5" y="18.4" width="9" height="1.6" rx=".8" fill="#a5b4fc" />
      <rect x="11.5" y="21.8" width="5.5" height="1.6" rx=".8" fill="#a5b4fc" />
    </svg>
  );
}

/** Mark plus wordmark. Pass `href` to make it a link. */
export function Logo({
  href,
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  const content = (
    <>
      <LogoMark decorative={showWordmark} />
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight">
          Resume<span className="text-primary">Forge</span>
        </span>
      )}
    </>
  );
  const classes = cn("inline-flex items-center gap-2.5", className);

  return href ? (
    <Link href={href} className={cn(classes, "rounded-md")} aria-label="ResumeForge home">
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}
