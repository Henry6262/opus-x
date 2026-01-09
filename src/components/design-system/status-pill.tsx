import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "live" | "warn" | "hot" | "neutral";
}

const toneClass: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  live: "status-live",
  warn: "status-warn",
  hot: "status-hot",
  neutral: "status-pill",
};

export function StatusPill({ className, tone = "neutral", ...props }: StatusPillProps) {
  const base = tone === "neutral" ? "status-pill" : cn("status-pill", toneClass[tone]);
  return <span className={cn(base, className)} {...props} />;
}
