"use client";

import { useWalletContext } from "@/providers/WalletProvider";
import { useTokenGate } from "@/hooks/useTokenGate";
import { Wallet, LogOut, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletButtonProps {
  className?: string;
  showBalance?: boolean;
}

export function WalletButton({ className, showBalance = true }: WalletButtonProps) {
  const { connected, connecting, publicKey, walletName, connect, disconnect } = useWalletContext();
  const { isGated, balance, minRequired, isVerifying } = useTokenGate();

  const truncatedAddress = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : null;

  const formatBalance = (bal: number) => {
    if (bal >= 1_000_000) return `${(bal / 1_000_000).toFixed(1)}M`;
    if (bal >= 1_000) return `${(bal / 1_000).toFixed(1)}K`;
    return bal.toFixed(0);
  };

  if (!connected) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className={cn(
          "relative z-50 flex items-center gap-2 px-5 py-2.5 rounded-lg",
          "bg-gradient-to-r from-[#c4f70e] to-[#a8d60d]",
          "text-black font-semibold text-sm",
          "hover:opacity-90 hover:scale-105 transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "shadow-[0_0_20px_rgba(196,247,14,0.4)]",
          className
        )}
      >
        {connecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "bg-white/5 border border-white/10",
        className
      )}
    >
      {/* Wallet info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">{walletName}</span>
          {isGated && (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          )}
        </div>
        <span className="text-sm font-mono text-white">{truncatedAddress}</span>
      </div>

      {/* Balance */}
      {showBalance && (
        <div className="flex flex-col items-end border-l border-white/10 pl-3">
          <span className="text-xs text-white/60">$SR</span>
          <div className="flex items-center gap-1">
            {isVerifying ? (
              <Loader2 className="w-3 h-3 animate-spin text-white/60" />
            ) : (
              <>
                <span
                  className={cn(
                    "text-sm font-medium",
                    balance >= minRequired ? "text-green-500" : "text-yellow-500"
                  )}
                >
                  {formatBalance(balance)}
                </span>
                {balance < minRequired && (
                  <span className="text-xs text-white/40">
                    /{formatBalance(minRequired)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Disconnect button */}
      <button
        onClick={disconnect}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        title="Disconnect"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
