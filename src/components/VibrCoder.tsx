'use client';

import { PortfolioWallet } from "@/features/portfolio-wallet";

export type AnimationState = 'idle' | 'analyzing' | 'rejecting' | 'buying' | 'incoming' | 'generating' | 'posting' | 'alert';

interface VibrCoderProps {
  state: AnimationState;
  className?: string;
  statusText?: string;
  reason?: string;
  pnl?: number;
  height?: number;
  size?: number;
  showWallet?: boolean;
  onAnimationComplete?: () => void;
}

export function VibrCoder({ state, className = '', statusText, reason, pnl, height, size, showWallet = true, onAnimationComplete }: VibrCoderProps) {
  // Compute styles based on size or height
  const containerStyle: React.CSSProperties = {};
  if (size) {
    containerStyle.width = size;
    containerStyle.height = size;
  } else if (height) {
    containerStyle.height = height;
  }

  return (
    <div className={`vibr-coder-container ${className}`} style={Object.keys(containerStyle).length > 0 ? containerStyle : undefined}>
      <video
        src="/videos/0109.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="vibr-coder-video"
      />

      {/* Bottom fade overlay for smooth section transition */}
      <div className="vibr-coder-fade vibr-coder-fade-bottom" />
      {/* Top fade overlay for smooth intro */}
      <div className="vibr-coder-fade vibr-coder-fade-top" />

      {/* Portfolio Wallet Widget - Top Left */}
      {showWallet && <PortfolioWallet />}
    </div>
  );
}
