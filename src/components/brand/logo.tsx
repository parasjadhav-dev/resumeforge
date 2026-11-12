import Link from "next/link";
import { BrandMarkSvg } from "@/lib/brand-art";
import { cn } from "@/lib/utils";

/** The ResumeForge mark. The drawing lives in lib/brand-art.tsx so generated icons match it. */
export function LogoMark({
  className,
  decorative = false,
}: {
  className?: string;
  /** True when the name is already shown next to it, so screen readers skip the image. */
  decorative?: boolean;
}) {
  return <BrandMarkSvg className={cn("size-8 shrink-0", className)} decorative={decorative} />;
}

/** Mark plus wordmark ("Forge" in the copper accent). Pass `href` to make it a link. */
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
          Resume<span className="text-brand">Forge</span>
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
