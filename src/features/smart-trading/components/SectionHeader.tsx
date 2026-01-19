"use client";

import { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  tooltip?: string;
  count?: number;
  countColor?: "lime" | "yellow" | "blue" | "white";
  rightContent?: ReactNode;
}

const COUNT_COLORS = {
  lime: "bg-[#c4f70e]/20 text-[#c4f70e]",
  yellow: "bg-yellow-500/20 text-yellow-400",
  blue: "bg-blue-500/20 text-blue-400",
  white: "bg-white/10 text-white/70",
};

export function SectionHeader({
  icon,
  title,
  tooltip,
  count,
  countColor = "lime",
  rightContent,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1 py-3 mb-2 flex-shrink-0">
      {/* Left side: icon, title, tooltip */}
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-base font-semibold text-white">{title}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-0.5 rounded hover:bg-white/10 transition-colors">
                <Info className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[250px] bg-zinc-900 border border-white/10 text-white/90"
            >
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Right side: count badge and/or custom content */}
      <div className="flex items-center gap-2">
        {rightContent}
        {count !== undefined && count > 0 && (
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${COUNT_COLORS[countColor]}`}>
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

export default SectionHeader;
