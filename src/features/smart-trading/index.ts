export { SmartTradingSection } from "./SmartTradingSection";
export { SmartTradingDashboard } from "./SmartTradingDashboard";
export { useSmartTrading } from "./hooks/useSmartTrading";
export { useWebSocket, useSharedWebSocket } from "./hooks/useWebSocket";
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

// Real-time WebSocket-driven context (new)
export {
  RealTimeSmartTradingProvider,
  useConnectionStatus,
  useActivityFeed,
  useRealTimeDashboardStats,
  useRealTimePositions,
  useRealTimeWalletSignals,
  useRealTimeConfig,
  useRealTimeMigrationFeed,
} from "./context/RealTimeSmartTradingContext";
