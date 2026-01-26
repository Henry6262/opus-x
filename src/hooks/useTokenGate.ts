"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTokenBalance } from "./useTokenBalance";
import { SR_MIN_USD_VALUE, TOKEN_GATE_SESSION_DURATION } from "@/lib/config";
import {
  getTokenGateSession,
  setTokenGateSession,
  clearTokenGateSession,
  isSessionValid,
  getSessionTimeRemaining,
  type TokenGateSession,
} from "@/lib/tokenGateSession";

interface TokenGateState {
  // Gate status
  isGated: boolean;
  isVerifying: boolean;

  // Balance info (USD-based)
  balance: number;        // Token balance
  usdValue: number;       // USD value of holdings
  priceUsd: number;       // Current token price
  minRequiredUsd: number; // Min USD required ($100)

  // Session info
  lastVerified: number | null;
  sessionTimeRemaining: number;

  // Actions
  verify: () => Promise<boolean>;
  clearSession: () => void;
}

/**
 * Token gate hook that manages wallet verification and session state
 * Now uses USD value ($100 minimum) instead of token count
 *
 * Flow:
 * 1. On mount: Check cookie for existing session
 * 2. If session exists and not expired (12h) AND wallet matches: use cached values
 * 3. If session expired OR wallet changed: re-verify balance + price on chain
 * 4. Auto re-verify silently when session nears expiration
 */
export function useTokenGate(): TokenGateState {
  const { connected, publicKey } = useWalletContext();
  const {
    balance: chainBalance,
    usdValue: chainUsdValue,
    priceUsd: chainPriceUsd,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useTokenBalance(publicKey);

  const [session, setSession] = useState<TokenGateSession | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);

  // Load session from cookies on mount
  useEffect(() => {
    const savedSession = getTokenGateSession();
    if (savedSession && isSessionValid(savedSession, publicKey)) {
      setSession(savedSession);
      setSessionTimeRemaining(getSessionTimeRemaining(savedSession));
    }
  }, [publicKey]);

  // Update session time remaining periodically
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const remaining = getSessionTimeRemaining(session);
      setSessionTimeRemaining(remaining);

      // If session expired, clear it
      if (remaining <= 0) {
        setSession(null);
        clearTokenGateSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [session]);

  // Auto-verify when wallet connects but no valid session
  useEffect(() => {
    if (connected && publicKey && !isSessionValid(session, publicKey) && !isVerifying) {
      verify();
    }
  }, [connected, publicKey]);

  // Verify balance and create/update session
  const verify = useCallback(async (): Promise<boolean> => {
    if (!connected || !publicKey) {
      return false;
    }

    setIsVerifying(true);

    try {
      // Refetch balance + price from chain
      const { balance, usdValue, priceUsd } = await refetchBalance();

      // Create new session with the fresh values
      const newSession: TokenGateSession = {
        walletAddress: publicKey,
        balance,
        usdValue,
        priceUsd,
        verifiedAt: Date.now(),
      };

      setSession(newSession);
      setTokenGateSession(newSession);
      setSessionTimeRemaining(TOKEN_GATE_SESSION_DURATION);

      // Gate based on USD value, not token count
      return usdValue >= SR_MIN_USD_VALUE;
    } catch (error) {
      console.error("Token gate verification failed:", error);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [connected, publicKey, refetchBalance]);

  // Clear session and require re-verification
  const clearSessionHandler = useCallback(() => {
    setSession(null);
    clearTokenGateSession();
    setSessionTimeRemaining(0);
  }, []);

  // Determine if user passes the gate (USD-based)
  const effectiveBalance = session?.balance ?? chainBalance;
  const effectiveUsdValue = session?.usdValue ?? chainUsdValue;
  const effectivePriceUsd = session?.priceUsd ?? chainPriceUsd;
  const isGated = connected && effectiveUsdValue >= SR_MIN_USD_VALUE;

  return {
    isGated,
    isVerifying: isVerifying || isLoadingBalance,
    balance: effectiveBalance,
    usdValue: effectiveUsdValue,
    priceUsd: effectivePriceUsd,
    minRequiredUsd: SR_MIN_USD_VALUE,
    lastVerified: session?.verifiedAt ?? null,
    sessionTimeRemaining,
    verify,
    clearSession: clearSessionHandler,
  };
}
