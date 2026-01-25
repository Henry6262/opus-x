"use client";

import { ReactNode } from "react";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTokenGate } from "@/hooks/useTokenGate";
import { WalletButton } from "./WalletButton";
import { Wallet, Lock, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SR_TOKEN_MINT } from "@/lib/config";

interface TokenGateGuardProps {
  children: ReactNode;
  className?: string;
  fallbackClassName?: string;
  title?: string;
  description?: string;
}

const JUPITER_BUY_URL = `https://jup.ag/swap/SOL-${SR_TOKEN_MINT}`;
const DEXSCREENER_URL = `https://dexscreener.com/solana/${SR_TOKEN_MINT}`;

export function TokenGateGuard({
  children,
  className,
  fallbackClassName,
  title = "Super Router Calls",
  description,
}: TokenGateGuardProps) {
  const { connected, connecting } = useWalletContext();
  const { isGated, isVerifying, balance, minRequired } = useTokenGate();

  // If gated, render children
  if (connected && isGated) {
    return <div className={className}>{children}</div>;
  }

  // Show loading state while connecting or verifying
  if (connecting || isVerifying) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 rounded-xl",
          "bg-white/5 border border-white/10",
          fallbackClassName
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
        <p className="text-white/60 text-sm">
          {connecting ? "Connecting wallet..." : "Verifying $SR balance..."}
        </p>
      </div>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 rounded-xl",
          "bg-gradient-to-b from-white/5 to-transparent",
          "border border-white/10",
          fallbackClassName
        )}
      >
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-white/60" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

        <p className="text-white/60 text-sm text-center mb-6 max-w-xs">
          {description || "Connect your wallet to access exclusive features."}
        </p>

        <WalletButton showBalance={false} />
      </div>
    );
  }

  // Connected but insufficient balance
  const shortfall = minRequired - balance;
  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl",
        "bg-gradient-to-b from-yellow-500/5 to-transparent",
        "border border-yellow-500/20",
        fallbackClassName
      )}
    >
      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-yellow-500" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

      <p className="text-white/60 text-sm text-center mb-4 max-w-xs">
        Hold <span className="text-yellow-500 font-medium">{formatNumber(minRequired)} $SR</span> to
        unlock this feature.
      </p>

      {/* Balance info */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <span className="text-white/40">Your balance:</span>
        <span className="text-white font-medium">{formatNumber(balance)} $SR</span>
        <span className="text-white/40">
          (need {formatNumber(shortfall)} more)
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <a
          href={JUPITER_BUY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-gradient-to-r from-brand-primary to-brand-primary/80",
            "text-black font-medium text-sm",
            "hover:opacity-90 transition-opacity"
          )}
        >
          Buy $SR
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <a
          href={DEXSCREENER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-white/10 border border-white/20",
            "text-white font-medium text-sm",
            "hover:bg-white/15 transition-colors"
          )}
        >
          Chart
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
