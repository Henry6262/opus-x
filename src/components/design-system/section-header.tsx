import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold md:text-4xl">{title}</h2>
      {description ? (
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}
