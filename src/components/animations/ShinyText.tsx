"use client";

import { memo } from "react";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export const ShinyText = memo(function ShinyText({
  text,
  disabled = false,
  speed = 3,
  className = "",
}: ShinyTextProps) {
  return (
    <span
      className={`shiny-text ${disabled ? "shiny-disabled" : ""} ${className}`}
      style={{ "--shine-speed": `${speed}s` } as React.CSSProperties}
    >
      {text}
    </span>
  );
});
