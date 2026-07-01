import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-ring) disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-(--color-primary) text-(--color-primary-foreground) hover:opacity-90",
        destructive:
          "bg-(--color-destructive) text-(--color-destructive-foreground) hover:opacity-90",
        outline:
          "border bg-transparent hover:bg-(--color-muted) text-(--color-foreground)",
        secondary:
          "bg-(--color-secondary) text-(--color-secondary-foreground) hover:opacity-80",
        ghost: "hover:bg-(--color-muted) text-(--color-foreground)",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Muestra un spinner en lugar de `icon` y deshabilita el botón. */
  loading?: boolean;
  /** Icono a la izquierda del texto; lo reemplaza el spinner cuando `loading`. */
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
