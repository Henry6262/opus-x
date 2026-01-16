export type TerminalIconType =
  | 'brain'
  | 'microscope'
  | 'target'
  | 'zap'
  | 'thought'
  | 'search'
  | 'chart'
  | 'trending-up'
  | 'scale'
  | 'dice'
  | 'clipboard'
  | 'refresh'
  | 'alert-triangle'
  | 'shield'
  | 'lock'
  | 'gem'
  | 'flame'
  | 'rocket'
  | 'check'
  | 'x'
  | 'signal-low'
  | 'volume-x';

export interface TerminalLogEntry {
  id: string;
  time: string;
  text: string;
  color?: string;
  type?: 'standard' | 'thinking-step';
  isStreaming?: boolean;
  icon?: TerminalIconType;
}

export interface ThinkingState {
  isActive: boolean;
  tokenSymbol?: string;
  currentStep?: string;
}
