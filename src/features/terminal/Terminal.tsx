"use client";

import { useState, useEffect, useRef } from "react";
import { useTerminal } from "./TerminalProvider";

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 10;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 10, 5, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 255, 65, 0.15)';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="terminal-matrix-rain"
      aria-hidden="true"
    />
  );
}

export function Terminal() {
  const { logs } = useTerminal();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`terminal-drawer ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="terminal-collapse-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}
      >
        <svg
          className="terminal-collapse-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points={isCollapsed ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
        </svg>
        <span className="terminal-collapse-label">{isCollapsed ? 'OPEN' : ''}</span>
      </button>

      <aside className="terminal terminal-glass">
        <MatrixRain />
        <div className="terminal-header">
          <div className="terminal-status-indicator">
            <span className="terminal-status-dot" />
            <span className="terminal-status-text">LIVE</span>
          </div>
          <div className="terminal-title">AI REASONING TERMINAL</div>
          <div className="terminal-dots">
            <div className="terminal-dot active" />
            <div className="terminal-dot" />
            <div className="terminal-dot" />
          </div>
        </div>
        <div className="terminal-content">
          {logs.map((event, index) => (
            <div
              key={event.id}
              className="terminal-line"
              style={{
                animationDelay: `${index * 80}ms`,
                color: event.color,
              }}
            >
              <span className="terminal-time">[{event.time}]</span>
              <span className="terminal-text">{event.text}</span>
            </div>
          ))}
          <div className="terminal-line terminal-cursor-line">
            <span className="terminal-time">[LIVE]</span>
            <span>
              <span className="terminal-prompt">$</span>
              <span className="terminal-cursor">█</span>
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
