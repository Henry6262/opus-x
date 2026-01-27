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
            "relative flex items-center justify-center overflow-hidden rounded-2xl",
            "bg-black/90",
            "border border-[#c4f70e]/20",
            "min-h-[280px] max-w-4xl w-full",
            fallbackClassName
          )}
        >
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(196,247,14,0.08),transparent_70%)]" />

          <div className="flex flex-col items-center justify-center gap-6 z-10">
            {/* Custom spinner */}
            <div className="relative w-16 h-16">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#c4f70e]/20" />
              {/* Spinning arc */}
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#c4f70e] animate-spin"
                style={{ animationDuration: '1s' }}
              />
              {/* Inner pulse */}
              <div className="absolute inset-3 rounded-full bg-[#c4f70e]/10 animate-pulse" />
              {/* Center dot */}
              <div className="absolute inset-[26px] rounded-full bg-[#c4f70e]" />
            </div>

            <p className="text-white/60 text-sm font-medium tracking-wide">
              {connecting ? "Connecting wallet..." : "Loading..."}
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
            "relative overflow-hidden rounded-2xl",
            "border border-[#c4f70e]/20",
            "min-h-[280px] max-w-4xl w-full",
            fallbackClassName
          )}
        >
          {/* Full background GIF */}
          <div className="absolute inset-0">
            <Image
              src="/videos/scouting-v2.gif"
              alt="Super Router Scouting"
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/75" />

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(196,247,14,0.1),transparent_60%)]" />

          {/* Scan line effect */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
            }}
          />

          {/* Top bar: Wallet options (right aligned) */}
          <div className="relative z-10 flex items-start justify-end p-4 md:p-5">
            {/* Right: Wallet install links or detected wallets */}
            <div className="flex flex-col items-end gap-2">
              {noWalletFound ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {WALLETS.map((wallet) => (
                    <a
                      key={wallet.name}
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
                    >
                      <span className="text-sm">{wallet.icon}</span>
                      <span className="text-white text-xs">{wallet.name}</span>
                      <Download className="w-3 h-3 text-white/50" />
                    </a>
                  ))}
                </div>
              ) : availableWallets.length > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm">
                  <span className="text-xs font-mono text-white/60">
                    {availableWallets.join(", ")}
                  </span>
                </div>
              ) : (
                <span className="text-white/30 text-xs">Phantom, Solflare, Backpack</span>
              )}
            </div>
          </div>

          {/* Main content - centered */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-8 md:px-10 md:pb-10 text-center">
            {/* Exclusive Badge */}
            <div className="mb-3">
              <GradientText
                colors={['#c4f70e', '#00ff6a', '#c4f70e', '#a8d60d']}
                animationSpeed={4}
                showBorder={true}
                className="text-sm font-bold uppercase tracking-[0.15em]"
              >
                Exclusive for $SR Holders
              </GradientText>
            </div>

            {/* Title with Shiny Effect */}
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight leading-[1.1]">
              <ShinyText
                text={title}
                speed={3}
                color="#ffffff"
                shineColor="#c4f70e"
                className="font-black"
              />
            </h3>

            <p className="text-white/60 text-sm md:text-base mb-5 max-w-md leading-relaxed">
              {description || "Unlock exclusive trading insights, god wallet tracking & enhanced market signals."}
            </p>

            {/* Requirements pill + Connect button inline */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-[#c4f70e]/30 backdrop-blur-sm">
                <Lock className="w-3.5 h-3.5 text-[#c4f70e]" />
                <span className="text-[#c4f70e] font-bold text-xs">
                  Hold ${minRequiredUsd}+ of $SR
                </span>
              </div>

              <StarBorder
                as="button"
                color="#c4f70e"
                speed="4s"
                onClick={() => connect()}
                className="w-fit"
              >
                <span className="flex items-center gap-2 font-bold text-sm md:text-base">
                  {noWalletFound ? "Install Wallet" : "Connect Wallet"}
                </span>
              </StarBorder>
            </div>
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
          "relative overflow-hidden rounded-2xl",
          "border border-[#c4f70e]/20",
          "min-h-[280px] max-w-4xl w-full",
          fallbackClassName
        )}
      >
        {/* Full background GIF */}
        <div className="absolute inset-0">
          <Image
            src="/videos/scouting-v2.gif"
            alt="Super Router Scouting"
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/75" />

        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(196,247,14,0.1),transparent_60%)]" />

        {/* Scan line effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
          }}
        />

        {/* Top bar: Wallet connection (right aligned) */}
        <div className="relative z-10 flex items-start justify-end p-4 md:p-5">
          {/* Right: Wallet connection pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-white/60">
              {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : ""}
            </span>
            <button
              onClick={() => disconnect()}
              className="p-1.5 rounded-md hover:bg-red-500/20 transition-all text-white/50 hover:text-red-400 cursor-pointer"
              title="Disconnect"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main content - centered */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-8 md:px-10 md:pb-10 text-center">
          {/* Access Locked Badge */}
          <div className="mb-3 px-3 py-1 rounded-full bg-orange-500/20">
            <GradientText
              colors={['#ff6b6b', '#ff8e53', '#ff6b6b']}
              animationSpeed={3}
              showBorder={false}
              className="text-sm font-bold uppercase tracking-wider"
            >
              Access Locked
            </GradientText>
          </div>

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
            Almost there, anon
          </h3>

          {/* Balance display - compact horizontal */}
          <div className="mb-5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/40 text-xs">Holdings:</span>
                <span className="text-white font-bold text-base">
                  <CountUp to={balance} from={0} duration={1} separator="," className="tabular-nums" /> $SR
                </span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/40 text-xs">Value:</span>
                <span className={cn(
                  "font-bold text-base",
                  usdValue >= minRequiredUsd ? "text-emerald-400" : "text-red-400"
                )}>
                  {formatUsd(usdValue)}
                </span>
                <span className="text-white/30 text-xs">
                  / ${minRequiredUsd}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-[280px] h-1.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-[#c4f70e] to-[#a8d60d] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((usdValue / minRequiredUsd) * 100, 100)}%` }}
              />
            </div>
            <p className="text-white/40 text-[11px]">
              {Math.max(0, minRequiredUsd - usdValue).toFixed(2)} USD more needed
            </p>
          </div>

          {/* Buy Button */}
          <StarBorder
            as="a"
            href={JUPITER_BUY_URL}
            target="_blank"
            rel="noopener noreferrer"
            color="#c4f70e"
            speed="4s"
            borderRadius="12px"
            className="w-fit"
          >
            <span className="flex items-center gap-2 font-bold text-sm md:text-base">
              Buy $SR on Jupiter
              <ExternalLink className="w-4 h-4" />
            </span>
          </StarBorder>
        </div>
      </div>
    </div>
  );
}
