import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-(--color-primary) text-(--color-primary-foreground)",
        secondary:
          "border-transparent bg-(--color-secondary) text-(--color-secondary-foreground)",
        success:
          "border-transparent bg-(--color-success) text-(--color-success-foreground)",
        warning:
          "border-transparent bg-(--color-warning) text-(--color-warning-foreground)",
        destructive:
          "border-transparent bg-(--color-destructive) text-(--color-destructive-foreground)",
        outline: "text-(--color-foreground)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
