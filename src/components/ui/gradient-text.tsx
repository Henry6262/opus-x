"use client";

import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: "cyan" | "green" | "purple" | "rainbow" | "gold";
  animate?: boolean;
}

const gradients = {
  cyan: "from-cyan-400 via-blue-500 to-purple-500",
  green: "from-green-400 via-emerald-500 to-teal-500",
  purple: "from-purple-400 via-pink-500 to-red-500",
  rainbow: "from-red-500 via-yellow-500 to-green-500",
  gold: "from-yellow-400 via-amber-500 to-orange-500",
};

export function GradientText({
  children,
  className,
  gradient = "cyan",
  animate = false,
}: GradientTextProps) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r bg-clip-text text-transparent",
        gradients[gradient],
        animate && "animate-gradient bg-[length:200%_auto]",
        className
      )}
    >
      {children}
    </span>
  );
}
