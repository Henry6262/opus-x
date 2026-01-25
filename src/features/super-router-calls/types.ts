// Super Router Calls Types

export interface TrackerWallet {
  id: string;
  address: string;
  label: string | null;
  pfpUrl: string | null;
  twitterHandle: string | null;
  trustScore: number;
  isGodWallet: boolean;
  isActive: boolean;
}

export interface WalletEntry {
  wallet: TrackerWallet;
  entryPriceUsd: number;
  entryMarketCap: number;
  amountUsd: number;
  timestamp: string;
  txHash: string;
}

export interface TokenWithTrackerEntries {
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  currentPriceUsd: number;
  currentMarketCap: number;
  state: TokenState;
  trackerEntries: WalletEntry[];
  aiDecision: AiDecision | null;
  aiConfidence: number | null;
  aiReasoning: string | null;
  lastUpdated: string;
}

export type TokenState =
  | "MONITORING"    // Being watched, no entry yet
  | "GOOD_BUY"      // AI recommends entry
  | "ENTERED"       // Position opened
  | "TP1_HIT"       // First take profit hit
  | "TP2_HIT"       // Second take profit hit
  | "STOPPED"       // Stop loss triggered
  | "CLOSED";       // Position fully closed

export type AiDecision = "ENTER" | "WAIT" | "PASS";

export interface GodWalletBuy {
  wallet: TrackerWallet;
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  amountUsd: number;
  amountSol: number;
  timestamp: string;
  txHash: string;
  copiedBySystem: boolean;
}

export interface SuperRouterCallsStats {
  totalTrackerWallets: number;
  activeGodWallets: number;
  tokensWithTrackerEntries: number;
  recentGodWalletBuys: number;
}
