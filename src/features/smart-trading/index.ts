export { SmartTradingSection } from "./SmartTradingSection";
export { useSmartTrading } from "./hooks/useSmartTrading";
export { smartTradingService } from "./service";
export type * from "./types";

// Context-based API (recommended for shared data)
export {
  SmartTradingProvider,
  useSmartTradingContext,
  useDashboardStats,
  usePositions,
  useWalletSignals,
  useSmartTradingConfig,
  useMigrationFeedContext,
} from "./context";
