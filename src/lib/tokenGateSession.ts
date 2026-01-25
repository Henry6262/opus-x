"use client";

import { TOKEN_GATE_SESSION_DURATION } from "./config";

const COOKIE_NAME = "sr_token_gate_session";

export interface TokenGateSession {
  walletAddress: string;
  balance: number;
  verifiedAt: number;
}

/**
 * Get the token gate session from cookies
 */
export function getTokenGateSession(): TokenGateSession | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return null;

  try {
    const value = decodeURIComponent(cookie.split("=")[1]);
    const session: TokenGateSession = JSON.parse(value);
    return session;
  } catch {
    return null;
  }
}

/**
 * Save the token gate session to cookies
 */
export function setTokenGateSession(session: TokenGateSession): void {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(session));
  const expires = new Date(Date.now() + TOKEN_GATE_SESSION_DURATION);

  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

/**
 * Clear the token gate session from cookies
 */
export function clearTokenGateSession(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Check if the session is still valid (not expired and wallet matches)
 */
export function isSessionValid(
  session: TokenGateSession | null,
  currentWalletAddress: string | null
): boolean {
  if (!session || !currentWalletAddress) return false;

  // Check if wallet address matches
  if (session.walletAddress !== currentWalletAddress) return false;

  // Check if session has expired
  const now = Date.now();
  const sessionAge = now - session.verifiedAt;

  return sessionAge < TOKEN_GATE_SESSION_DURATION;
}

/**
 * Calculate time remaining until session expires
 */
export function getSessionTimeRemaining(session: TokenGateSession | null): number {
  if (!session) return 0;

  const now = Date.now();
  const expiresAt = session.verifiedAt + TOKEN_GATE_SESSION_DURATION;
  const remaining = expiresAt - now;

  return Math.max(0, remaining);
}
