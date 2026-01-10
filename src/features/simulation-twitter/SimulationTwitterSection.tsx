"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

// Feature preview handles to show as examples
const PREVIEW_HANDLES = ["elonmusk", "VitalikButerin", "caborb", "SolanaLegend"];

export function SimulationTwitterSection() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <section className="section-content">
      {/* Centered Header with Coming Soon Badge */}
      <div className="section-header-centered">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h2 className="section-title">Twitter Quote Bot</h2>
          <div className="coming-soon-badge">
            <Lock className="w-3 h-3" />
            <span>COMING SOON</span>
          </div>
        </div>
        <p className="section-description">
          AI-powered quote tweeting with custom art generation
        </p>
      </div>

      {/* Locked Feature Card */}
      <div
        className="coming-soon-card group"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Scanline overlay effect */}
        <div className="coming-soon-scanlines" />

        {/* Lock icon center */}
        <div className="coming-soon-lock-container">
          <div className="coming-soon-lock-ring">
            <div className="coming-soon-lock-ring-inner">
              <Lock className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <div className="coming-soon-lock-glow" />
        </div>

        {/* Feature preview content (blurred/locked) */}
        <div className="coming-soon-preview">
          {/* Mock target accounts */}
          <div className="coming-soon-preview-panel">
            <div className="coming-soon-preview-header">
              <span className="text-xs uppercase tracking-widest text-white/30">Target Accounts</span>
              <div className="w-2 h-2 rounded-full bg-white/20" />
            </div>
            <div className="space-y-2 mt-3">
              {PREVIEW_HANDLES.map((handle) => (
                <div key={handle} className="coming-soon-preview-item">
                  <span className="text-sm text-white/30">@{handle}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
              ))}
            </div>
          </div>

          {/* Mock feed panel */}
          <div className="coming-soon-preview-panel flex-1">
            <div className="coming-soon-preview-header">
              <span className="text-xs uppercase tracking-widest text-white/30">Live Tweet Feed</span>
              <div className="w-2 h-2 rounded-full bg-white/20" />
            </div>
            <div className="coming-soon-preview-feed">
              <div className="coming-soon-preview-tweet" />
              <div className="coming-soon-preview-tweet" />
              <div className="coming-soon-preview-tweet short" />
            </div>
          </div>
        </div>

        {/* Tooltip on hover */}
        <div className={`coming-soon-tooltip ${showTooltip ? 'visible' : ''}`}>
          <div className="coming-soon-tooltip-arrow" />
          <div className="coming-soon-tooltip-content">
            <div className="coming-soon-tooltip-header">
              <svg className="w-4 h-4 text-brand-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-bold text-brand-primary">AI Quote Bot</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Track live tweets from key figures, generate custom art, and quote tweet at them — all using AI.
            </p>
            <div className="coming-soon-tooltip-stats">
              <div className="coming-soon-tooltip-stat">
                <span className="text-brand-primary font-mono font-bold">&lt;10s</span>
                <span className="text-white/40 text-xs">execution</span>
              </div>
              <div className="coming-soon-tooltip-stat">
                <span className="text-matrix-green font-mono font-bold">AI</span>
                <span className="text-white/40 text-xs">powered</span>
              </div>
              <div className="coming-soon-tooltip-stat">
                <span className="text-solana-cyan font-mono font-bold">24/7</span>
                <span className="text-white/40 text-xs">monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action hint */}
        <div className="coming-soon-footer">
          <span className="text-xs text-white/30 font-mono">Hover for details</span>
        </div>
      </div>
    </section>
  );
}
