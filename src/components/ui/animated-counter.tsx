"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, useInView } from "motion/react";

interface AnimatedCounterProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  direction = "up",
  className = "",
  duration = 1.5,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(direction === "up" ? 0 : value, {
    stiffness: 75,
    damping: 15,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(direction === "up" ? value : 0);
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated, spring, value, direction]);

  // Update when value changes
  useEffect(() => {
    if (hasAnimated) {
      spring.set(value);
    }
  }, [value, hasAnimated, spring]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
