"use client";

import { useState, useEffect, useCallback, memo } from "react";

interface ScrambleTextProps {
  text: string;
  speed?: number;
  scrambleSpeed?: number;
  scrambleChars?: string;
  className?: string;
  onComplete?: () => void;
}

const DEFAULT_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/\\~`0123456789";

export const ScrambleText = memo(function ScrambleText({
  text,
  speed = 50,
  scrambleSpeed = 30,
  scrambleChars = DEFAULT_CHARS,
  className = "",
  onComplete,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [isScrambling, setIsScrambling] = useState(true);

  const getRandomChar = useCallback(() => {
    return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
  }, [scrambleChars]);

  useEffect(() => {
    if (!text) {
      setDisplayText("");
      return;
    }

    setIsScrambling(true);
    let currentIndex = 0;
    let scrambleCount = 0;
    const maxScrambles = 3;
    const chars = text.split("");
    const resolved = new Array(chars.length).fill(false);
    const display = chars.map(() => getRandomChar());

    setDisplayText(display.join(""));

    const interval = setInterval(() => {
      // Scramble unresolved characters
      for (let i = currentIndex; i < chars.length; i++) {
        if (!resolved[i] && chars[i] !== " ") {
          display[i] = getRandomChar();
        }
      }

      // Handle space characters immediately
      if (currentIndex < chars.length && chars[currentIndex] === " ") {
        display[currentIndex] = " ";
        resolved[currentIndex] = true;
        currentIndex++;
      }

      scrambleCount++;

      // Resolve next character after scramble cycles
      if (scrambleCount >= maxScrambles && currentIndex < chars.length) {
        display[currentIndex] = chars[currentIndex];
        resolved[currentIndex] = true;
        currentIndex++;
        scrambleCount = 0;
      }

      setDisplayText(display.join(""));

      // Check if complete
      if (currentIndex >= chars.length) {
        clearInterval(interval);
        setIsScrambling(false);
        onComplete?.();
      }
    }, currentIndex < chars.length ? speed : scrambleSpeed);

    return () => clearInterval(interval);
  }, [text, speed, scrambleSpeed, getRandomChar, onComplete]);

  return (
    <span className={`font-mono ${className}`} data-scrambling={isScrambling}>
      {displayText}
    </span>
  );
});

export default ScrambleText;
