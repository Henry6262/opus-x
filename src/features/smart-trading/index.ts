export { SmartTradingSection } from "./SmartTradingSection";
export { SmartTradingDashboard } from "./SmartTradingDashboard";
export { useWebSocket, useSharedWebSocket } from "./hooks/useWebSocket";
export { useBirdeyeWalletHoldings } from "./hooks/useBirdeyeWalletHoldings";
export { useBirdeyePolling } from "./hooks/useBirdeyePolling";
export { smartTradingService } from "./service";
export type * from "./types";

// Context-based API (unified WebSocket-first architecture)
export {
  SmartTradingProvider,
  useSmartTradingContext,
  useDashboardStats,
  usePositions,
  useWalletSignals,
  useSmartTradingConfig,
  useMigrationFeedContext,
  useConnectionStatus,
  useActivityFeed,
} from "./context";

export type { ActivityItem } from "./context";
