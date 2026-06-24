// Central config switch for local development/demo mode.
// When HARDCODED_MODE is true the app uses the hardcoded URLs and mock data
// below instead of hitting the real (currently 404'ing) backends.
//
// Toggle:
//   - Flip HARDCODED_MODE_DEFAULT below, OR
//   - Set NEXT_PUBLIC_HARDCODED_MODE=false in .env.local to disable.
// Hardcoded mode is force-enabled for the current marketing/demo phase.
// This guarantees the dashboard renders with mock data even when live backends
// are down or unreachable (CORS/WebSocket issues on production).
export const HARDCODED_MODE = true;

// Hardcoded backend endpoints (used when HARDCODED_MODE is true)
export const HARDCODED_PONZINOMICS_API_URL = "https://ponzinomics-production.up.railway.app";
export const HARDCODED_DEVPRINT_CORE_URL = "https://devprint-v2-production.up.railway.app";
export const HARDCODED_DEVPRINT_WS_URL = "wss://devprint-v2-production.up.railway.app";
export const HARDCODED_PONZINOMICS_WS_URL = "wss://ponzinomics-production.up.railway.app";

// Public URLs exposed to the browser
export const PONZINOMICS_API_URL = HARDCODED_MODE
  ? HARDCODED_PONZINOMICS_API_URL
  : process.env.NEXT_PUBLIC_PONZINOMICS_API_URL || HARDCODED_PONZINOMICS_API_URL;

export const DEVPRNT_CORE_URL = HARDCODED_MODE
  ? HARDCODED_DEVPRINT_CORE_URL
  : process.env.NEXT_PUBLIC_DEVPRNT_CORE_URL || HARDCODED_DEVPRINT_CORE_URL;

// Server-side absolute URLs (used in API routes, never exposed to browser)
export const getServerPonzinomicsApiUrl = () =>
  HARDCODED_MODE
    ? HARDCODED_PONZINOMICS_API_URL
    : process.env.PONZINOMICS_API_URL ||
      process.env.NEXT_PUBLIC_PONZINOMICS_API_URL ||
      HARDCODED_PONZINOMICS_API_URL;

export const getServerDevprintCoreUrl = () =>
  HARDCODED_MODE
    ? HARDCODED_DEVPRINT_CORE_URL
    : process.env.DEVPRNT_CORE_URL ||
      process.env.NEXT_PUBLIC_DEVPRNT_CORE_URL ||
      HARDCODED_DEVPRINT_CORE_URL;

// Super Router token gating configuration
export const SR_TOKEN_MINT = process.env.NEXT_PUBLIC_SR_TOKEN_MINT || "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump";
// USD-based gating: user must hold at least $100 worth of $SR token
export const SR_MIN_USD_VALUE = Number(process.env.NEXT_PUBLIC_SR_MIN_USD_VALUE) || 100;
// Legacy token count threshold (deprecated, use USD value instead)
export const SR_MIN_BALANCE = Number(process.env.NEXT_PUBLIC_SR_MIN_BALANCE) || 250000;

// Token gate session duration (12 hours in milliseconds)
export const TOKEN_GATE_SESSION_DURATION = 12 * 60 * 60 * 1000;
