import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * An inline status message (info, success, warning, or danger).
 * Colours come from the status tokens in globals.css, which are contrast-checked in both themes.
 */
const noticeVariants = cva("rounded-lg border p-3 text-sm", {
  variants: {
    variant: {
      info: "border-info-border bg-info text-info-foreground",
      success: "border-success-border bg-success text-success-foreground",
      warning: "border-warning-border bg-warning text-warning-foreground",
      danger: "border-danger-border bg-danger text-danger-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});

function Notice({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof noticeVariants>) {
  return (
    <div data-slot="notice" className={cn(noticeVariants({ variant }), className)} {...props} />
  );
}

export { Notice, noticeVariants };
