import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-white/15 bg-black/40 px-3 text-sm text-white",
        "placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[var(--accent)]",
        className
      )}
      {...props}
    />
  );
}
