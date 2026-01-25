"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTokenBalance } from "./useTokenBalance";
import { SR_MIN_BALANCE, TOKEN_GATE_SESSION_DURATION } from "@/lib/config";
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

  // Balance info
  balance: number;
  minRequired: number;

  // Session info
  lastVerified: number | null;
  sessionTimeRemaining: number;

  // Actions
  verify: () => Promise<boolean>;
  clearSession: () => void;
}

/**
 * Token gate hook that manages wallet verification and session state
 *
 * Flow:
 * 1. On mount: Check cookie for existing session
 * 2. If session exists and not expired (12h) AND wallet matches: use cached balance
 * 3. If session expired OR wallet changed: re-verify balance on chain
 * 4. Auto re-verify silently when session nears expiration
 */
export function useTokenGate(): TokenGateState {
  const { connected, publicKey } = useWalletContext();
  const { balance: chainBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useTokenBalance(publicKey);

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
      // Refetch balance from chain - returns the actual balance
      const freshBalance = await refetchBalance();

      // Create new session with the fresh balance
      const newSession: TokenGateSession = {
        walletAddress: publicKey,
        balance: freshBalance,
        verifiedAt: Date.now(),
      };

      setSession(newSession);
      setTokenGateSession(newSession);
      setSessionTimeRemaining(TOKEN_GATE_SESSION_DURATION);

      return freshBalance >= SR_MIN_BALANCE;
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

  // Determine if user passes the gate
  const effectiveBalance = session?.balance ?? chainBalance;
  const isGated = connected && effectiveBalance >= SR_MIN_BALANCE;

  return {
    isGated,
    isVerifying: isVerifying || isLoadingBalance,
    balance: effectiveBalance,
    minRequired: SR_MIN_BALANCE,
    lastVerified: session?.verifiedAt ?? null,
    sessionTimeRemaining,
    verify,
    clearSession: clearSessionHandler,
  };
}
