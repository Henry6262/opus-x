"use client";

import { useTerminal } from "./TerminalProvider";

export function Terminal() {
  const { logs } = useTerminal();

  return (
    <aside className="terminal">
      <div className="terminal-header">
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
              animationDelay: `${index * 50}ms`,
              color: event.color,
            }}
          >
            <span className="terminal-time">[{event.time}]</span>
            <span>{event.text}</span>
          </div>
        ))}
        {/* Animated cursor prompt */}
        <div className="terminal-line terminal-cursor-line">
          <span className="terminal-time">[LIVE]</span>
          <span>
            <span className="terminal-prompt">$</span>
            <span className="terminal-cursor">█</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
