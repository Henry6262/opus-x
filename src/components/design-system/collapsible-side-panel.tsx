"use client";

import { useState, useEffect, type ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleSidePanelProps {
  children: ReactNode;
  icon: ReactNode;
  title?: string;
  defaultCollapsed?: boolean;
  collapsedWidth?: number;
  expandedWidth?: string;
  direction?: "left" | "right";
  className?: string;
  contentClassName?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
  // New: for accordion behavior
  id?: string;
  activeId?: string | null;
  onActivate?: (id: string) => void;
}

export function CollapsibleSidePanel({
  children,
  icon,
  title,
  defaultCollapsed = false,
  collapsedWidth = 48,
  expandedWidth = "100%",
  direction = "left",
  className,
  contentClassName,
  onCollapsedChange,
  // Accordion props
  id,
  activeId,
  onActivate,
}: CollapsibleSidePanelProps) {
  // If accordion mode (activeId provided), use that, otherwise use local state
  const isAccordionMode = activeId !== undefined && id !== undefined;
  const [localCollapsed, setLocalCollapsed] = useState(defaultCollapsed);

  const isCollapsed = isAccordionMode ? activeId !== id : localCollapsed;

  const toggleCollapsed = useCallback(() => {
    if (isAccordionMode && id) {
      // In accordion mode, always call onActivate with this panel's ID
      // Parent will handle cycling to next panel if this one is already active
      onActivate?.(id);
    } else {
      const newState = !localCollapsed;
      setLocalCollapsed(newState);
      onCollapsedChange?.(newState);
    }
  }, [isAccordionMode, id, localCollapsed, onActivate, onCollapsedChange]);

  const ChevronIcon = direction === "left"
    ? (isCollapsed ? ChevronRight : ChevronLeft)
    : (isCollapsed ? ChevronLeft : ChevronRight);

  return (
    <div className="relative h-full">
      {/* Toggle button - positioned at the right edge of the panel */}
      <motion.button
        onClick={toggleCollapsed}
        initial={false}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-50",
          "w-6 h-12 flex items-center justify-center",
          "bg-black/80 border border-white/20 rounded-full",
          "hover:bg-white/20 hover:border-[#c4f70e]/50",
          "transition-colors duration-200",
          "shadow-[0_0_20px_rgba(0,0,0,0.5)]",
          // Position at the right edge of the panel content
          direction === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
        )}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        <ChevronIcon className="w-4 h-4 text-white/80" />
      </motion.button>

      {/* Panel container */}
      <motion.div
        initial={false}
        animate={{
          width: isCollapsed ? collapsedWidth : expandedWidth,
        }}
        transition={{
          duration: 0.4,
          ease: [0.32, 0.72, 0, 1],
        }}
        className={cn(
          "h-full rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col",
          className
        )}
      >
        {/* Collapsed state - just icon */}
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full flex flex-col items-center py-4 cursor-pointer"
              onClick={toggleCollapsed}
            >
              <motion.div
                className="text-[#c4f70e]"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {icon}
              </motion.div>
              {title && (
                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                  className="mt-3 text-[10px] font-medium text-white/60 uppercase tracking-wider"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  {title}
                </motion.span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className={cn("h-full flex flex-col overflow-hidden", contentClassName)}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
