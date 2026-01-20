export { TerminalProvider, useTerminal } from "./TerminalProvider";
export type { BootPhase } from "./TerminalProvider";
export { Terminal } from "./Terminal";
export { useTerminalNarrator } from "./hooks/useTerminalNarrator";
export { useAiReasoningStream, dispatchTerminalEvent } from "./hooks/useAiReasoningStream";
export { useTerminalBoot, BOOT_DURATION, BOOT_SEQUENCE } from "./hooks/useTerminalBoot";
export type { TerminalLogEntry, ThinkingState } from "./types";

// Event system exports for extensibility
export { resolveEvent, getEventPriority } from "./terminal-events";
export type { TerminalEvent, TerminalEventType } from "./terminal-events";
export { generateMessage, getCategoryColor, shouldStream, getTypingSpeed } from "./ai-personality";
export type { MessageCategory, MessageContext, HighlightType } from "./ai-personality";

