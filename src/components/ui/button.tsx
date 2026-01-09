import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "solid" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  solid: "bg-[var(--accent)] text-black hover:brightness-110",
  outline: "border border-white/20 text-white hover:bg-white/10",
  ghost: "text-white/70 hover:text-white hover:bg-white/10",
  danger: "bg-[var(--terminal-red)] text-white hover:brightness-110",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  className,
  variant = "solid",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        "disabled:pointer-events-none disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
