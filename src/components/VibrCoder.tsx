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
  const showPnl = (state === 'buying' || statusText === 'BULLISH' || statusText === 'BEARISH') && pnl !== undefined;
  const isBullish = statusText === 'BULLISH';

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
      <div className="vibr-coder-overlay">
        <div className="gradient-text font-bold text-2xl mb-2">VIBR CODER</div>
        <div className="flex items-center justify-center gap-2">
          <div className={`status-indicator status-${state}`}>
            <div className="w-2 h-2 rounded-full bg-current"></div>
            {statusText || state.toUpperCase()}
          </div>
        </div>
        {reason && (
          <div className="text-xs opacity-75 mt-2 text-center">
            {reason}
          </div>
        )}
        {showPnl && (
          <div className={`text-lg font-bold mt-2 ${isBullish ? 'text-[var(--matrix-green)]' : 'text-[var(--alert-red)]'}`}>
            {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}
