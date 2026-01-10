"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface SmartMoneyAnimationProps {
  className?: string;
  size?: number;
}

export function SmartMoneyAnimation({
  className = "",
  size = 24
}: SmartMoneyAnimationProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: "auto",
        WebkitFontSmoothing: "antialiased",
        transform: "translateZ(0)",
        willChange: "transform"
      }}
    >
      <DotLottieReact
        src="https://lottie.host/9148988c-1963-405f-9ec2-82abb0bdca8b/miOHO3xUR6.lottie"
        loop
        autoplay
        style={{
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}
