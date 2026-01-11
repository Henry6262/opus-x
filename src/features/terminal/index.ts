export { TerminalProvider, useTerminal } from "./TerminalProvider";
export { Terminal } from "./Terminal";
export { useTerminalNarrator } from "./hooks/useTerminalNarrator";
export type { TerminalLogEntry, ThinkingState } from "./types";

// Event system exports for extensibility
export { resolveEvent, getEventPriority } from "./terminal-events";
export type { TerminalEvent, TerminalEventType } from "./terminal-events";
export { generateMessage, getCategoryColor } from "./ai-personality";
export type { MessageCategory, MessageContext } from "./ai-personality";
