"use client";

import { useEffect, useState, useRef } from "react";
import { CountUp } from "./CountUp";

interface AnimatedPnLProps {
  value: number;
  className?: string;
  refreshIntervalMs?: number;
  duration?: number;
}

export function AnimatedPnL({
  value,
  className = "",
  refreshIntervalMs = 60000,
  duration = 1.2,
}: AnimatedPnLProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [showArrow, setShowArrow] = useState(false);
  const [arrowDirection, setArrowDirection] = useState<"up" | "down" | null>(null);
  const isFirstRender = useRef(true);

  const isProfitable = displayValue > 0;
  const isNegative = displayValue < 0;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (value !== previousValue) {
      const direction = value > previousValue ? "up" : "down";
      setArrowDirection(direction);
      setShowArrow(true);
      setPreviousValue(displayValue);
      setDisplayValue(value);

      const timer = setTimeout(() => {
        setShowArrow(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [value, previousValue, displayValue]);

  useEffect(() => {
    setDisplayValue(value);
    setPreviousValue(value);
  }, []);

  return (
    <div className={`animated-pnl-container ${className}`}>
      <div className={`animated-pnl-value ${isProfitable ? "positive" : isNegative ? "negative" : "neutral"}`}>
        <CountUp
          from={previousValue}
          to={displayValue}
          duration={duration}
          prefix={isProfitable ? "+" : ""}
          suffix="%"
        />
      </div>
      {showArrow && arrowDirection && (
        <div className={`animated-pnl-arrow ${arrowDirection}`}>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {arrowDirection === "up" ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 15l7-7 7 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 9l-7 7-7-7"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
