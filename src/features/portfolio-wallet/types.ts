export interface PortfolioStats {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  winnersCount: number;
  losersCount: number;
  winRate: number;
  avgPnL: number;
  topPerformer: {
    symbol: string;
    pnlPercent: number;
  } | null;
  worstPerformer: {
    symbol: string;
    pnlPercent: number;
  } | null;
  totalTrades: number;
}

export interface Position {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  entryTime: Date;
  /** Whether position is validated against Birdeye on-chain data */
  isValidated?: boolean;
  /** USD value from Birdeye (blockchain validated) */
  birdeyeValueUsd?: number | null;
}

export interface Transaction {
  id: string;
  mint?: string;
  type: "buy" | "sell";
  symbol: string;
  price: number;
  quantity: number;
  value: number;
  pnl?: number;
  pnlPercent?: number;
  timestamp: Date;
  txHash?: string;
}

export interface PortfolioWalletProps {
  className?: string;
}

export type TimeFilter = "1H" | "24H" | "1W" | "1M" | "ALL";
export type WalletView = "overview" | "positions" | "history";

export interface ChartHistoryEntry {
  timestamp: string | Date;
  totalValueSol: number;
}
