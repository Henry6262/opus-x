/**
 * Vibr Coder Test Page
 *
 * Test and preview all character animations with manual controls
 */

'use client';

import { useState } from 'react';
import { VibrCoder, AnimationState } from '@/components/VibrCoder';
import { useVibrCoderState, TradingEventType } from '@/hooks/useVibrCoderState';
import '@/components/vibr-coder.css';

export default function TestVibrCoderPage() {
  const { state, triggerEvent } = useVibrCoderState();
  const [manualState, setManualState] = useState<AnimationState>('idle');
  const [useManual, setUseManual] = useState(false);

  const states: AnimationState[] = [
    'idle',
    'analyzing',
    'rejecting',
    'buying',
    'alert',
    'generating',
    'posting',
  ];

  const events: TradingEventType[] = [
    'TOKEN_DETECTED',
    'ANALYSIS_START',
    'TOKEN_REJECTED',
    'BUY_EXECUTE',
    'TWEET_DETECTED',
    'IMAGE_GENERATING',
    'TWEET_POSTED',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Vibr Coder Animation Test
          </h1>
          <p className="text-gray-400">
            Test character animations for the trading terminal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Character Display */}
          <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              Character Preview
            </h2>

            <div className="flex items-center justify-center bg-black/50 rounded-lg p-8 mb-4">
              <div className="vibr-coder-container">
                <div className="vibr-coder-screen" />
                <VibrCoder
                  state={useManual ? manualState : state}
                  size={300}
                  onAnimationComplete={() => {
                    console.log('Animation complete');
                  }}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Current State:</p>
              <p className="text-2xl font-mono text-green-400">
                {useManual ? manualState : state}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useManual}
                  onChange={(e) => setUseManual(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-300">Manual Control</span>
              </label>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="space-y-6">
            {/* Manual State Selector */}
            {useManual && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Manual State Control
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {states.map((s) => (
                    <button
                      key={s}
                      onClick={() => setManualState(s)}
                      className={`px-4 py-2 rounded font-mono text-sm transition-colors ${
                        manualState === s
                          ? 'bg-green-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Event Triggers */}
            {!useManual && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Event Triggers
                </h3>
                <div className="space-y-2">
                  {events.map((event) => (
                    <button
                      key={event}
                      onClick={() => triggerEvent(event)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-mono text-sm transition-colors"
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Scenarios */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Scenarios
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    triggerEvent('TOKEN_DETECTED');
                    setTimeout(() => triggerEvent('ANALYSIS_START'), 500);
                    setTimeout(() => triggerEvent('BUY_EXECUTE'), 2000);
                  }}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  🚀 Sniper Workflow (Detect → Analyze → Buy)
                </button>

                <button
                  onClick={() => {
                    triggerEvent('TOKEN_DETECTED');
                    setTimeout(() => triggerEvent('ANALYSIS_START'), 500);
                    setTimeout(() => triggerEvent('TOKEN_REJECTED'), 2000);
                  }}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  ❌ Reject Workflow (Detect → Analyze → Reject)
                </button>

                <button
                  onClick={() => {
                    triggerEvent('TWEET_DETECTED');
                    setTimeout(() => triggerEvent('IMAGE_GENERATING'), 500);
                    setTimeout(() => triggerEvent('TWEET_POSTED'), 3000);
                  }}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  🎨 Meme Factory (Tweet → Generate → Post)
                </button>
              </div>
            </div>

            {/* Info Panel */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Animation Info
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="font-mono text-green-400">
                    {useManual ? 'Manual' : 'Event-Driven'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Loop:</span>
                  <span className="font-mono text-blue-400">
                    {['idle', 'analyzing', 'generating'].includes(
                      useManual ? manualState : state
                    )
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Implementation:</span>
                  <span className="font-mono text-yellow-400">Sprite Sheet</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">
            📝 Setup Instructions
          </h3>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
            <li>
              Extract frames from videos: <code className="bg-black/50 px-2 py-1 rounded">npm run extract:all</code>
            </li>
            <li>
              Remove backgrounds using Runway ML or Unscreen.com
            </li>
            <li>
              Create sprite sheets: <code className="bg-black/50 px-2 py-1 rounded">npm run sprite:all</code>
            </li>
            <li>
              Sprite sheets will be in <code className="bg-black/50 px-2 py-1 rounded">/public/sprites/</code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
