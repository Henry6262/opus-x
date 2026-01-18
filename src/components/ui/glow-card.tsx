"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({
  children,
  className,
  glowColor = "rgba(34, 211, 238, 0.15)",
}: GlowCardProps) {
  return (
    <motion.div
      className={cn(
        "relative group rounded-xl overflow-hidden",
        className
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
        style={{ background: `linear-gradient(135deg, ${glowColor}, transparent, ${glowColor})` }}
      />

      {/* Border gradient */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
        {children}
      </div>
    </motion.div>
  );
}
