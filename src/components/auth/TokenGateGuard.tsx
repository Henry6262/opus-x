"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTokenGate } from "@/hooks/useTokenGate";
import { Loader2, ExternalLink, Sparkles, Download, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SR_TOKEN_MINT } from "@/lib/config";
import CountUp from "@/components/CountUp";

interface TokenGateGuardProps {
  children: ReactNode;
  className?: string;
  fallbackClassName?: string;
  title?: string;
  description?: string;
}

const JUPITER_BUY_URL = `https://jup.ag/swap/SOL-${SR_TOKEN_MINT}`;
const DEXSCREENER_URL = `https://dexscreener.com/solana/${SR_TOKEN_MINT}`;

const WALLETS = [
  { name: "Phantom", url: "https://phantom.app/", icon: "👻" },
  { name: "Solflare", url: "https://solflare.com/", icon: "🔥" },
  { name: "Backpack", url: "https://backpack.app/", icon: "🎒" },
];

export function TokenGateGuard({
  children,
  className,
  fallbackClassName,
  title = "Super Router Calls",
  description,
}: TokenGateGuardProps) {
  const { connected, connecting, connect, disconnect, publicKey, walletName, availableWallets, noWalletFound } = useWalletContext();
  const { isGated, isVerifying, balance, minRequired } = useTokenGate();

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.floor(n / 1_000)}K`;
    return n.toLocaleString();
  };

  // If gated, render children
  if (connected && isGated) {
    return <div className={className}>{children}</div>;
  }

  // Show loading state while connecting or verifying
  if (connecting || isVerifying) {
    return (
      <div className="flex justify-center">
        <div
          className={cn(
            "relative flex items-end overflow-hidden rounded-2xl",
            "bg-gradient-to-r from-[#c4f70e]/5 via-black/80 to-black/90",
            "border border-[#c4f70e]/20",
            "min-h-[320px] max-w-4xl w-full",
            fallbackClassName
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(196,247,14,0.15),transparent_50%)]" />

          <div className="relative flex-shrink-0 self-end z-10">
            <Image
              src="/character/watching.png"
              alt="Super Router"
              width={280}
              height={280}
              className="opacity-50 w-[180px] h-[180px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px]"
              priority
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Loader2 className="w-12 h-12 animate-spin text-[#c4f70e] mb-4" />
            <p className="text-white/70 text-lg font-medium">
              {connecting ? "Connecting wallet..." : "Verifying $SR balance..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - show connect prompt
  if (!connected) {
    return (
      <div className="flex justify-center">
        <div
          className={cn(
            "relative flex items-end overflow-hidden rounded-2xl",
            "bg-gradient-to-r from-[#c4f70e]/10 via-black/80 to-black/95",
            "border border-[#c4f70e]/30",
            "min-h-[320px] max-w-4xl w-full",
            fallbackClassName
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(196,247,14,0.2),transparent_50%)]" />

          <div className="relative flex-shrink-0 self-end z-10">
            <Image
              src="/character/watching.png"
              alt="Super Router"
              width={320}
              height={320}
              className="w-[180px] h-[180px] md:w-[260px] md:h-[260px] lg:w-[320px] lg:h-[320px]"
              priority
            />
          </div>

          <div className="flex-1 flex flex-col justify-center p-6 md:p-10 z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#c4f70e]" />
              <span className="text-[#c4f70e] text-sm font-bold uppercase tracking-wider">
                Only for $SR holders
              </span>
            </div>

            <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
              {title}
            </h3>

            <p className="text-white/60 text-base md:text-lg mb-5 max-w-md leading-relaxed">
              {description || "Exclusive trading insights, god wallet tracking & enhanced signals for $SR holders."}
            </p>

            <p className="text-white/40 text-base mb-6">
              Requires{" "}
              <span className="text-[#c4f70e] font-bold">
                <CountUp to={minRequired} from={0} duration={1.5} separator="," className="tabular-nums" /> $SR
              </span>
            </p>

            {noWalletFound && (
              <div className="mb-6">
                <p className="text-white/50 text-sm mb-3">
                  No wallet detected. Install one:
                </p>
                <div className="flex flex-wrap gap-2">
                  {WALLETS.map((wallet) => (
                    <a
                      key={wallet.name}
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span>{wallet.icon}</span>
                      <span className="text-white text-sm">{wallet.name}</span>
                      <Download className="w-3 h-3 text-white/50" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {availableWallets.length > 0 && !noWalletFound && (
              <p className="text-white/40 text-sm mb-4">
                Detected: {availableWallets.join(", ")}
              </p>
            )}

            <button
              onClick={() => connect()}
              className={cn(
                "relative z-50 flex items-center justify-center gap-3 px-10 py-4 rounded-xl w-fit",
                "bg-gradient-to-r from-[#c4f70e] to-[#a8d60d]",
                "text-black font-bold text-lg",
                "hover:scale-105 hover:shadow-[0_0_30px_rgba(196,247,14,0.5)] transition-all duration-300",
                "shadow-[0_0_20px_rgba(196,247,14,0.3)]"
              )}
            >
              {noWalletFound ? "Install Wallet" : "Connect Wallet"}
            </button>

            {!noWalletFound && availableWallets.length === 0 && (
              <p className="mt-4 text-white/30 text-sm">
                Supports Phantom, Solflare, Backpack
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Connected but insufficient balance - clean, minimal design
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "relative flex items-end overflow-hidden rounded-2xl",
          "bg-gradient-to-r from-[#c4f70e]/10 via-black/80 to-black/95",
          "border border-[#c4f70e]/30",
          "min-h-[320px] max-w-4xl w-full",
          fallbackClassName
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(196,247,14,0.2),transparent_50%)]" />

        <div className="relative flex-shrink-0 self-end z-10">
          <Image
            src="/character/watching.png"
            alt="Super Router"
            width={280}
            height={280}
            className="w-[180px] h-[180px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px]"
          />
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 md:p-10 z-10">
          {/* Wallet info - minimal */}
          <div className="flex items-center gap-3 mb-8">
            <span className="text-sm font-mono text-white/60">
              {walletName} · {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : ""}
            </span>
            <button
              onClick={() => disconnect()}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              title="Disconnect"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Not Eligible */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔒</span>
            <h3 className="text-2xl md:text-3xl font-bold text-white">Not Eligible Yet</h3>
          </div>

          {/* Balance */}
          <p className="text-white/50 text-lg mb-2">
            Your balance:{" "}
            <span className="text-white font-bold">
              <CountUp to={balance} from={0} duration={1} separator="," className="tabular-nums" /> $SR
            </span>
          </p>

          <p className="text-white/40 text-base mb-6">
            Requires {formatNumber(minRequired)} $SR
          </p>

          {/* Cooking message */}
          <p className="text-[#c4f70e] text-lg font-medium mb-8">
            Come back tomorrow. The team is cooking. 🍳
          </p>

          {/* Buy Button */}
          <a
            href={JUPITER_BUY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 px-10 py-4 rounded-xl w-fit",
              "bg-gradient-to-r from-[#c4f70e] to-[#a8d60d]",
              "text-black font-bold text-lg",
              "hover:scale-105 hover:shadow-[0_0_30px_rgba(196,247,14,0.5)] transition-all duration-300",
              "shadow-[0_0_20px_rgba(196,247,14,0.3)]"
            )}
          >
            Buy $SR on Jupiter
            <ExternalLink className="w-5 h-5" />
          </a>

          {/* DexScreener link */}
          <a
            href={DEXSCREENER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-white/40 text-sm hover:text-white/70 transition-colors flex items-center gap-1 w-fit"
          >
            View chart on DexScreener
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
