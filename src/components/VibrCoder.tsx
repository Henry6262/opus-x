'use client';

interface VibrCoderProps {
  state: 'idle' | 'analyzing' | 'rejecting' | 'buying' | 'incoming' | 'generating' | 'posting';
  className?: string;
  statusText?: string;
  reason?: string;
  pnl?: number;
  height?: number;
}

export function VibrCoder({ state, className = '', statusText, reason, pnl, height }: VibrCoderProps) {
  const showPnl = (state === 'buying' || statusText === 'BULLISH' || statusText === 'BEARISH') && pnl !== undefined;
  const isBullish = statusText === 'BULLISH';

  return (
    <div className={`vibr-coder-container ${className}`} style={height ? { height } : undefined}>
      <video
        src="/videos/scene-1-idle.mp4"
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
