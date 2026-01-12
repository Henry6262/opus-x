'use client';

import { useState } from 'react';

export default function VibrTestPage() {
  const [animation, setAnimation] = useState<'idle' | 'analyzing' | 'rejecting'>('idle');

  const gifs = {
    idle: '/videos/scene-1-idle.gif',
    analyzing: '/videos/scene-2-png-gif.gif',
    rejecting: '/videos/scene-3-reject.gif',
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-green-400 mb-8 font-mono">
        VIBR CODER TEST
      </h1>

      {/* Just use the GIF directly! */}
      <div className="mb-8">
        <img
          src={gifs[animation]}
          alt={`Vibr Coder ${animation}`}
          style={{
            height: '400px',
            width: 'auto',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={() => setAnimation('idle')}
          className={`px-6 py-3 rounded font-mono text-lg transition-all ${
            animation === 'idle'
              ? 'bg-green-500 text-black'
              : 'bg-gray-800 text-green-400 hover:bg-gray-700'
          }`}
        >
          IDLE
        </button>
        <button
          onClick={() => setAnimation('analyzing')}
          className={`px-6 py-3 rounded font-mono text-lg transition-all ${
            animation === 'analyzing'
              ? 'bg-green-500 text-black'
              : 'bg-gray-800 text-green-400 hover:bg-gray-700'
          }`}
        >
          ANALYZING
        </button>
        <button
          onClick={() => setAnimation('rejecting')}
          className={`px-6 py-3 rounded font-mono text-lg transition-all ${
            animation === 'rejecting'
              ? 'bg-green-500 text-black'
              : 'bg-gray-800 text-green-400 hover:bg-gray-700'
          }`}
        >
          REJECT
        </button>
      </div>

      {/* Info */}
      <div className="mt-8 text-green-400 font-mono text-sm">
        <p>Current: {animation.toUpperCase()}</p>
        <p>Height: 400px</p>
        <p>Transparent Background: ✓</p>
        <p>Ready: 3/7 animations</p>
      </div>
    </div>
  );
}
