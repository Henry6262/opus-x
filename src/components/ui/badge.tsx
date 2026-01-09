import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "live" | "warn" | "hot";
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-white/10 text-white/70 border border-white/10",
  live: "bg-[rgba(125,255,143,0.16)] text-[var(--terminal-green)] border border-[rgba(125,255,143,0.3)]",
  warn: "bg-[rgba(255,209,102,0.18)] text-[var(--terminal-yellow)] border border-[rgba(255,209,102,0.3)]",
  hot: "bg-[rgba(255,90,95,0.2)] text-[var(--terminal-red)] border border-[rgba(255,90,95,0.35)]",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
