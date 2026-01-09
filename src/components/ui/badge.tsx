import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "live" | "warn" | "hot";
}

// Solid, attention-grabbing colors - smaller and compact
const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-white/20 text-white/80",
  live: "bg-[#00ff41] text-black", // Solid matrix green
  warn: "bg-[#ffcc00] text-black", // Solid yellow - attention grabbing
  hot: "bg-[#ff3366] text-white", // Solid red/pink
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
