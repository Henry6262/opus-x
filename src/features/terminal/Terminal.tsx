"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useTerminal } from "./TerminalProvider";
import type { TerminalLogEntry } from "./types";

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

// ============================================
// Typewriter Effect Component
// ============================================

interface TypewriterTextProps {
  text: string;
  isStreaming?: boolean;
  onComplete?: () => void;
  baseSpeed?: number;
}

function TypewriterText({
  text,
  isStreaming,
  onComplete,
  baseSpeed = 28,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("");
    setIsComplete(false);
    indexRef.current = 0;

    if (!isStreaming) {
      // If not streaming, show full text immediately
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const typeNextChar = () => {
      if (indexRef.current >= text.length) {
        setIsComplete(true);
        onComplete?.();
        return;
      }

      const char = text[indexRef.current];
      indexRef.current++;
      setDisplayedText(text.slice(0, indexRef.current));

      // Calculate delay for next character
      let delay = baseSpeed;

      // Pause longer on punctuation
      if (char === "." || char === "!" || char === "?") {
        delay = baseSpeed * 8; // 224ms pause
      } else if (char === ",") {
        delay = baseSpeed * 4; // 112ms pause
      } else if (char === "…" || char === ":") {
        delay = baseSpeed * 6; // 168ms pause
      }

      // Small random variance for natural feel
      delay += Math.random() * 10 - 5;

      timeoutRef.current = setTimeout(typeNextChar, delay);
    };

    // Start typing after small initial delay
    timeoutRef.current = setTimeout(typeNextChar, 50);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, isStreaming, baseSpeed, onComplete]);

  return (
    <>
      {displayedText}
      {isStreaming && !isComplete && <span className="streaming-cursor">|</span>}
    </>
  );
}

// ============================================
// Terminal Line Component
// ============================================

interface TerminalLineProps {
  event: TerminalLogEntry;
  isInitialItem: boolean;
  isFirstRender: boolean;
  animationDelay: string;
}

function TerminalLine({
  event,
  isInitialItem,
  isFirstRender,
  animationDelay,
}: TerminalLineProps) {
  const isThinkingStep = event.type === "thinking-step";

  const lineClass = useMemo(() => {
    let cls = isFirstRender && isInitialItem
      ? "terminal-line"
      : "terminal-line terminal-line-new";
    if (isThinkingStep) {
      cls += " thinking-step";
    }
    return cls;
  }, [isFirstRender, isInitialItem, isThinkingStep]);

  return (
    <div
      className={lineClass}
      style={{
        animationDelay,
        color: event.color,
      }}
    >
      {isThinkingStep && <span className="thinking-indicator">&gt;</span>}
      <span className="terminal-time">[{event.time}]</span>
      <span className="terminal-text">
        <TypewriterText
          text={event.text}
          isStreaming={event.isStreaming}
        />
      </span>
    </div>
  );
}

// ============================================
// Main Terminal Component
// ============================================

export function Terminal() {
  const { logs } = useTerminal();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const terminalRef = useRef<HTMLElement>(null);
  const prevLogsLengthRef = useRef(logs.length);
  const initialLogCountRef = useRef(logs.length);

  // Check if at bottom helper
  const checkIsAtBottom = useCallback(() => {
    if (!terminalRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    // Consider "at bottom" if within 50px of the bottom
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Scroll to the actual bottom of content with smooth behavior
  const scrollToBottom = useCallback((force = false) => {
    if (!terminalRef.current) return;
    if (force || !userScrolledUp) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: 'smooth'
      });
      if (force) {
        setUserScrolledUp(false);
      }
    }
  }, [userScrolledUp]);

  // Handle manual scroll to bottom button click
  const handleScrollToBottomClick = useCallback(() => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Handle user scroll - detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!terminalRef.current) return;
    const atBottom = checkIsAtBottom();
    setUserScrolledUp(!atBottom);
  }, [checkIsAtBottom]);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (logs.length > prevLogsLengthRef.current) {
      // New logs added - wait for animation to complete before scrolling
      // Initial load uses staggered animation, new items use fast animation (200ms)
      const delay = isFirstRender ? 100 : 250;
      const timer = setTimeout(scrollToBottom, delay);
      prevLogsLengthRef.current = logs.length;
      return () => clearTimeout(timer);
    }
    prevLogsLengthRef.current = logs.length;
  }, [logs.length, scrollToBottom, isFirstRender]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Mark animation as complete and first render done after initial logs animate
  useEffect(() => {
    if (logs.length > 0) {
      const totalAnimationTime = initialLogCountRef.current * 80 + 400;
      const timer = setTimeout(() => {
        setAnimationComplete(true);
        setIsFirstRender(false);
      }, totalAnimationTime);
      return () => clearTimeout(timer);
    }
  }, []); // Only run once on mount

  return (
    <div className={`terminal-drawer ${isCollapsed ? 'collapsed' : ''}`}>
      {isCollapsed && (
        <button
          className={`terminal-collapse-btn ${isCollapsed ? 'terminal-collapse-btn--epic' : ''}`}
          onClick={() => setIsCollapsed(false)}
          aria-label="Open AI Terminal"
          type="button"
        >
          <>
            {/* Animated gradient background */}
            <span className="terminal-open-btn__gradient" />
            {/* Floating particles */}
            <span className="terminal-open-btn__particles">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="terminal-open-btn__particle"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </span>
          </>

          {/* Icon container with glass effect when collapsed */}
          <span className={`terminal-collapse-btn__icon-wrap ${isCollapsed ? 'terminal-collapse-btn__icon-wrap--glass' : ''}`}>
            <svg
              className="terminal-collapse-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </span>

          {/* Two-line label */}
          <span className="terminal-open-btn__label">
            <span className="terminal-open-btn__label-text">OPEN</span>
            <span className="terminal-open-btn__label-text terminal-open-btn__label-text--sub">AI TERMINAL</span>
          </span>
        </button>
      )}

      <aside
        ref={terminalRef}
        className={`terminal terminal-glass ${animationComplete ? 'animation-complete' : ''}`}
        onScroll={handleScroll}
      >
        <MatrixRain />
        <div className="terminal-header">
          <div className="terminal-status-indicator">
            <span className="terminal-status-dot" />
            <span className="terminal-status-text">LIVE</span>
          </div>
          <div className="terminal-title">AI REASONING TERMINAL</div>
          <div
            className="terminal-dots"
            onClick={() => setIsCollapsed(true)}
            role="button"
            tabIndex={0}
            aria-label="Collapse terminal"
            title="Collapse terminal"
            onKeyDown={(e) => e.key === 'Enter' && setIsCollapsed(true)}
          >
            <div className="terminal-dot active" />
            <div className="terminal-dot" />
            <div className="terminal-dot" />
          </div>
        </div>
        <div className="terminal-content">
          {logs.map((event, index) => {
            const isInitialItem = index < initialLogCountRef.current;
            const animationDelay = isFirstRender && isInitialItem
              ? `${index * 80}ms`
              : "0ms";

            return (
              <TerminalLine
                key={event.id}
                event={event}
                isInitialItem={isInitialItem}
                isFirstRender={isFirstRender}
                animationDelay={animationDelay}
              />
            );
          })}
          <div className="terminal-line terminal-cursor-line">
            <span className="terminal-time">[LIVE]</span>
            <span>
              <span className="terminal-prompt">$</span>
              <span className="terminal-cursor">█</span>
            </span>
          </div>
        </div>

        {/* Scroll to bottom button - only shows when scrolled up */}
        {userScrolledUp && (
          <button
            className="terminal-scroll-bottom-btn"
            onClick={handleScrollToBottomClick}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </aside>
    </div>
  );
}
