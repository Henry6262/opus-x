"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  prefix = "",
  suffix = "",
  decimals,
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  // Track if initial animation has been triggered
  const hasAnimatedRef = useRef(false);

  const getDecimalPlaces = (num: number): number => {
    const str = num.toString();
    if (str.includes(".")) {
      const decimals = str.split(".")[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  };

  const autoDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));
  const maxDecimals = decimals !== undefined ? decimals : autoDecimals;

  const formatValue = useCallback(
    (latest: number) => {
      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      };

      const formattedNumber = Intl.NumberFormat("en-US", options).format(latest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator]
  );

  // Set initial text content
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = `${prefix}${formatValue(direction === "down" ? to : from)}${suffix}`;
    }
  }, [from, to, direction, formatValue, prefix, suffix]);

  // Handle initial animation when in view
  useEffect(() => {
    if (isInView && startWhen) {
      if (!hasAnimatedRef.current && typeof onStart === "function") {
        onStart();
      }
      hasAnimatedRef.current = true;

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === "down" ? from : to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === "function") {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);

  // Track previous value to detect real changes
  const prevToRef = useRef(to);

  // Update target when `to` value changes (for live data updates)
  // Only run after initial animation and when value actually changes
  useEffect(() => {
    if (hasAnimatedRef.current && prevToRef.current !== to) {
      const targetValue = direction === "down" ? from : to;
      motionValue.set(targetValue);
    }
    prevToRef.current = to;
  }, [to, from, direction, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest: number) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${formatValue(latest)}${suffix}`;
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue, prefix, suffix]);

  return <span className={className} ref={ref} />;
}
