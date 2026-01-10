export interface TerminalLogEntry {
  id: string;
  time: string;
  text: string;
  color?: string;
  type?: 'standard' | 'thinking-step';
  isStreaming?: boolean;
}

export interface ThinkingState {
  isActive: boolean;
  tokenSymbol?: string;
  currentStep?: string;
}
