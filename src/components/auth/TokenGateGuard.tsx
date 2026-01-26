"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { useWalletContext } from "@/providers/WalletProvider";
import { useTokenGate } from "@/hooks/useTokenGate";
import { Loader2, ExternalLink, Download, LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SR_TOKEN_MINT } from "@/lib/config";
import CountUp from "@/components/CountUp";
import ShinyText from "@/components/ShinyText";
import GradientText from "@/components/GradientText";
import StarBorder from "@/components/StarBorder";

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
  const { isGated, isVerifying, balance, usdValue, minRequiredUsd } = useTokenGate();

  const formatUsd = (n: number) => {
    return `$${n.toFixed(2)}`;
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

          {/* Scouting GIF - Loading state */}
          <div className="relative flex-shrink-0 self-center z-10 ml-6 md:ml-10">
            <div className="absolute -inset-3 rounded-3xl blur-xl bg-[#c4f70e]/15 animate-pulse" />
            <div className="relative w-[100px] h-[140px] md:w-[140px] md:h-[196px] rounded-2xl overflow-hidden opacity-60">
              <Image
                src="/videos/scouting-v2.gif"
                alt="Super Router Scouting"
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
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
            "bg-gradient-to-br from-black via-zinc-950 to-black",
            "border border-[#c4f70e]/20",
            "min-h-[360px] max-w-4xl w-full",
            fallbackClassName
          )}
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(196,247,14,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(196,247,14,0.08),transparent_40%)]" />

          {/* Scan line effect */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
            }}
          />

          {/* Scouting GIF - Vertical aspect ratio, no border */}
          <div className="relative flex-shrink-0 self-center z-10 ml-6 md:ml-10">
            <div className="absolute -inset-4 rounded-3xl blur-2xl bg-[#c4f70e]/25" />
            <div className="relative w-[140px] h-[196px] md:w-[200px] md:h-[280px] lg:w-[240px] lg:h-[336px] rounded-2xl overflow-hidden shadow-2xl shadow-[#c4f70e]/40">
              <Image
                src="/videos/scouting-v2.gif"
                alt="Super Router Scouting"
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center p-6 md:p-10 z-10">
            {/* Exclusive Badge with Gradient Animation */}
            <div className="mb-5">
              <GradientText
                colors={['#c4f70e', '#00ff6a', '#c4f70e', '#a8d60d']}
                animationSpeed={4}
                showBorder={true}
                className="text-sm font-bold uppercase tracking-[0.2em]"
              >
                Exclusive for $SR Holders
              </GradientText>
            </div>

            {/* Title with Shiny Effect */}
            <h3 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight leading-[1.1]">
              <ShinyText
                text={title}
                speed={3}
                color="#ffffff"
                shineColor="#c4f70e"
                className="font-black"
              />
            </h3>

            <p className="text-white/50 text-base md:text-lg mb-6 max-w-md leading-relaxed">
              {description || "Unlock exclusive trading insights, god wallet tracking & enhanced market signals."}
            </p>

            {/* Requirements pill */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#c4f70e]/10 border border-[#c4f70e]/30">
                <Lock className="w-4 h-4 text-[#c4f70e]" />
                <span className="text-[#c4f70e] font-bold text-sm">
                  Hold ${minRequiredUsd}+ worth of $SR
                </span>
              </div>
            </div>

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
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
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
              <p className="text-white/30 text-xs mb-4 font-mono">
                Detected: {availableWallets.join(", ")}
              </p>
            )}

            {/* Connect Button with Star Border */}
            <StarBorder
              as="button"
              color="#c4f70e"
              speed="4s"
              onClick={() => connect()}
              className="w-fit"
            >
              <span className="flex items-center gap-3 font-bold text-lg">
                {noWalletFound ? "Install Wallet" : "Connect Wallet"}
              </span>
            </StarBorder>

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

  // Connected but insufficient balance
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "relative flex items-end overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-black via-zinc-950 to-black",
          "border border-[#c4f70e]/20",
          "min-h-[360px] max-w-4xl w-full",
          fallbackClassName
        )}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(196,247,14,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(255,100,100,0.05),transparent_40%)]" />

        {/* Scouting GIF - Insufficient balance state */}
        <div className="relative flex-shrink-0 self-center z-10 ml-6 md:ml-10">
          <div className="absolute -inset-4 rounded-3xl blur-2xl bg-[#c4f70e]/20" />
          <div className="relative w-[140px] h-[196px] md:w-[180px] md:h-[252px] rounded-2xl overflow-hidden shadow-xl shadow-[#c4f70e]/30 opacity-85">
            <Image
              src="/videos/scouting-v2.gif"
              alt="Super Router Scouting"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 md:p-10 z-10">
          {/* Wallet info - minimal */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-white/60">
                {walletName} · {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : ""}
              </span>
              <button
                onClick={() => disconnect()}
                className="p-1 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                title="Disconnect"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Not Eligible Badge */}
          <div className="mb-4">
            <GradientText
              colors={['#ff6b6b', '#ff8e53', '#ff6b6b']}
              animationSpeed={3}
              showBorder={true}
              className="text-sm font-bold uppercase tracking-wider"
            >
              Access Locked
            </GradientText>
          </div>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Almost there, anon
          </h3>

          {/* Balance display */}
          <div className="mb-6 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-white/40 text-sm">Your holdings:</span>
              <span className="text-white font-bold text-lg">
                <CountUp to={balance} from={0} duration={1} separator="," className="tabular-nums" /> $SR
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-white/40 text-sm">Value:</span>
              <span className={cn(
                "font-bold text-xl",
                usdValue >= minRequiredUsd ? "text-emerald-400" : "text-amber-400"
              )}>
                {formatUsd(usdValue)}
              </span>
              <span className="text-white/30 text-sm">
                / ${minRequiredUsd} required
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-[#c4f70e] to-[#a8d60d] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((usdValue / minRequiredUsd) * 100, 100)}%` }}
              />
            </div>
            <p className="text-white/30 text-xs">
              {Math.max(0, minRequiredUsd - usdValue).toFixed(2)} USD more needed
            </p>
          </div>

          {/* Buy Button with Star Border */}
          <StarBorder
            as="a"
            href={JUPITER_BUY_URL}
            target="_blank"
            rel="noopener noreferrer"
            color="#c4f70e"
            speed="4s"
            className="w-fit"
          >
            <span className="flex items-center gap-2 font-bold text-lg">
              Buy $SR on Jupiter
              <ExternalLink className="w-5 h-5" />
            </span>
          </StarBorder>

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
