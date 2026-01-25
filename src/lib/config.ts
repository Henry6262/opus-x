export const PONZINOMICS_API_URL =
  process.env.NEXT_PUBLIC_PONZINOMICS_API_URL ||
  "https://ponzinomics-production.up.railway.app";

export const DEVPRNT_CORE_URL =
  process.env.NEXT_PUBLIC_DEVPRNT_CORE_URL || "https://devprint-v2-production.up.railway.app";

// Super Router token gating configuration
export const SR_TOKEN_MINT = process.env.NEXT_PUBLIC_SR_TOKEN_MINT || "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump";
export const SR_MIN_BALANCE = Number(process.env.NEXT_PUBLIC_SR_MIN_BALANCE) || 1000;
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// Token gate session duration (12 hours in milliseconds)
export const TOKEN_GATE_SESSION_DURATION = 12 * 60 * 60 * 1000;
