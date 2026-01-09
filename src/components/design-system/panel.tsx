import * as React from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  glow?: boolean;
}

export function Panel({
  as: Component = "div",
  className,
  glow = true,
  ...props
}: PanelProps) {
  return (
    <Component
      className={cn("panel", glow && "shadow-[0_0_30px_var(--panel-glow)]", className)}
      {...props}
    />
  );
}
