import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        // Match score variants
        excellent:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        good: "border-amber/30 bg-amber/10 text-amber",
        fair: "border-muted-foreground/30 bg-muted text-muted-foreground",
        // Job type badges
        remote:
          "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
        hybrid:
          "border-violet-500/30 bg-violet-500/10 text-violet-400",
        onsite:
          "border-orange-500/30 bg-orange-500/10 text-orange-400",
        // Status badges
        active:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        pending:
          "border-amber/30 bg-amber/10 text-amber",
        closed:
          "border-muted-foreground/30 bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
