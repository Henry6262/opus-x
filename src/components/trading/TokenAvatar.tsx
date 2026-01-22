/**
 * TokenAvatar - Reusable token image component
 *
 * Displays token image with fallback to:
 * 1. DexScreener image URL
 * 2. Gradient background with initials
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const AVATAR_COLORS: [string, string][] = [
  ["#c4f70e", "#22d3ee"],
  ["#f97316", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#10b981", "#14b8a6"],
  ["#eab308", "#f97316"],
  ["#ec4899", "#8b5cf6"],
];

function getAvatarColors(symbol: string): [string, string] {
  const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export interface TokenAvatarProps {
  /** Optional image URL from API */
  imageUrl?: string | null;
  /** Token symbol for fallback initials */
  symbol: string;
  /** Token mint address for DexScreener fallback */
  mint: string;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Additional className */
  className?: string;
  /** Border radius style */
  rounded?: 'full' | 'xl' | 'lg' | 'md';
}

export function TokenAvatar({
  imageUrl,
  symbol,
  mint,
  size = 48,
  className,
  rounded = 'xl'
}: TokenAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [color1, color2] = getAvatarColors(symbol);
  const initials = symbol.slice(0, 2).toUpperCase();

  const dexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
  const finalImageUrl = imageUrl || dexScreenerUrl;

  const roundedClass = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    lg: 'rounded-lg',
    md: 'rounded-md',
  }[rounded];

  if (imgError || !finalImageUrl) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center font-bold text-white shadow-lg flex-shrink-0",
          roundedClass,
          className
        )}
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
          fontSize: size * 0.35,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden flex-shrink-0 shadow-lg",
        roundedClass,
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={finalImageUrl}
        alt={symbol}
        width={size}
        height={size}
        className="object-cover"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  );
}
