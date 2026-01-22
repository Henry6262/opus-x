"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface SolIconProps {
  size?: number;
  className?: string;
}

/**
 * Inline Solana icon for use next to values/text
 * Replaces " SOL" text suffix with the Solana logo
 */
export function SolIcon({ size = 14, className }: SolIconProps) {
  return (
    <Image
      src="/logos/solana.png"
      alt="SOL"
      width={size}
      height={size}
      className={cn("inline-block ml-1 opacity-80", className)}
    />
  );
}
