import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page width and side padding. Wide enough to use a desktop screen well,
 * with comfortable gutters on phones.
 */
export function PageContainer({
  className,
  size = "default",
  ...props
}: ComponentProps<"div"> & { size?: "default" | "wide" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        size === "wide" ? "max-w-[96rem]" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}
