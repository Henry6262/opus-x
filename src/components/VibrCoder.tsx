'use client';

export type AnimationState = 'idle' | 'analyzing' | 'rejecting' | 'buying' | 'incoming' | 'generating' | 'posting' | 'alert';

interface VibrCoderProps {
  state: AnimationState;
  className?: string;
  statusText?: string;
  reason?: string;
  pnl?: number;
  height?: number;
  size?: number;
  onAnimationComplete?: () => void;
}

export function VibrCoder({ state, className = '', statusText, reason, pnl, height, size, onAnimationComplete }: VibrCoderProps) {
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
      {/* Gradient fade overlays for smooth visual transitions */}
      <div className="vibr-coder-fade vibr-coder-fade-bottom" />
      <div className="vibr-coder-fade vibr-coder-fade-left" />
      <div className="vibr-coder-fade vibr-coder-fade-right" />
      <div className="vibr-coder-fade vibr-coder-fade-top" />
      <div className="vibr-coder-vignette" />
      <div className="vibr-coder-overlay">
        <div className="gradient-text font-bold text-2xl">VIBR CODER</div>
      </div>
    </div>
  );
}
