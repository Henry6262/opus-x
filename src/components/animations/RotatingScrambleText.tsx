"use client";

import { useState, useEffect, useCallback, memo } from "react";

interface RotatingScrambleTextProps {
  messages: string[];
  interval?: number;
  speed?: number;
  scrambleChars?: string;
  className?: string;
}

const DEFAULT_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/\\~`0123456789ABCDEFabcdef";

export const RotatingScrambleText = memo(function RotatingScrambleText({
  messages,
  interval = 4000,
  speed = 40,
  scrambleChars = DEFAULT_CHARS,
  className = "",
}: RotatingScrambleTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<"scrambling-in" | "holding" | "scrambling-out">("scrambling-in");

  const getRandomChar = useCallback(() => {
    return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
  }, [scrambleChars]);

  const currentMessage = messages[currentIndex] || "";

  // Scramble in effect
  useEffect(() => {
    if (phase !== "scrambling-in" || !currentMessage) return;

    let charIndex = 0;
    let scrambleCount = 0;
    const maxScrambles = 3;
    const chars = currentMessage.split("");
    const resolved = new Array(chars.length).fill(false);
    const display = chars.map((c) => (c === " " ? " " : getRandomChar()));

    setDisplayText(display.join(""));

    const timer = setInterval(() => {
      // Scramble unresolved characters
      for (let i = charIndex; i < chars.length; i++) {
        if (!resolved[i] && chars[i] !== " ") {
          display[i] = getRandomChar();
        }
      }

      // Handle spaces immediately
      while (charIndex < chars.length && chars[charIndex] === " ") {
        display[charIndex] = " ";
        resolved[charIndex] = true;
        charIndex++;
      }

      scrambleCount++;

      // Resolve character after scramble cycles
      if (scrambleCount >= maxScrambles && charIndex < chars.length) {
        display[charIndex] = chars[charIndex];
        resolved[charIndex] = true;
        charIndex++;
        scrambleCount = 0;
      }

      setDisplayText(display.join(""));

      if (charIndex >= chars.length) {
        clearInterval(timer);
        setPhase("holding");
      }
    }, speed);

    return () => clearInterval(timer);
  }, [phase, currentMessage, speed, getRandomChar]);

  // Hold phase - wait before scrambling out
  useEffect(() => {
    if (phase !== "holding") return;

    const timer = setTimeout(() => {
      setPhase("scrambling-out");
    }, interval);

    return () => clearTimeout(timer);
  }, [phase, interval]);

  // Scramble out effect
  useEffect(() => {
    if (phase !== "scrambling-out" || !currentMessage) return;

    let charIndex = 0;
    let scrambleCount = 0;
    const maxScrambles = 2;
    const chars = currentMessage.split("");
    const scrambled = new Array(chars.length).fill(false);
    const display = [...chars];

    const timer = setInterval(() => {
      // Scramble already-scrambled characters
      for (let i = 0; i < charIndex; i++) {
        if (scrambled[i] && chars[i] !== " ") {
          display[i] = getRandomChar();
        }
      }

      // Handle spaces immediately
      while (charIndex < chars.length && chars[charIndex] === " ") {
        display[charIndex] = " ";
        scrambled[charIndex] = true;
        charIndex++;
      }

      scrambleCount++;

      // Start scrambling next character
      if (scrambleCount >= maxScrambles && charIndex < chars.length) {
        scrambled[charIndex] = true;
        display[charIndex] = getRandomChar();
        charIndex++;
        scrambleCount = 0;
      }

      setDisplayText(display.join(""));

      if (charIndex >= chars.length) {
        clearInterval(timer);
        // Move to next message
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setPhase("scrambling-in");
      }
    }, speed * 0.7); // Slightly faster out

    return () => clearInterval(timer);
  }, [phase, currentMessage, speed, getRandomChar, messages.length]);

  return (
    <span className={`font-mono inline-block min-w-[200px] ${className}`}>
      {displayText}
    </span>
  );
});

export default RotatingScrambleText;
