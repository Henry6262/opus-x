"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  RefreshCw,
  X,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Panel } from "@/components/design-system";
import { ShinyText } from "@/components/animations";
import { useRealTimeWalletSignals, useRealTimePositions } from "../context/RealTimeSmartTradingContext";
import type { TrackedWallet, TradingSignal, Position } from "../types";

// Format SOL amount
function formatSol(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return `${amount.toFixed(4)} SOL`;
}

// Format date
function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString() + " " + d.toLocaleDateString();
}

// Shorten address
function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Get signal strength color
function getStrengthColor(strength: string): string {
  switch (strength) {
    case "STRONG":
      return "text-green-400";
    case "WEAK":
      return "text-yellow-400";
    case "REJECTED":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

// Get position status color
function getStatusColor(status: string): string {
  switch (status) {
    case "OPEN":
      return "text-blue-400";
    case "CLOSED":
      return "text-green-400";
    case "STOPPED_OUT":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

// Brand color
const BRAND_GREEN = "#c4f70e";

// Hardcoded Twitter profile mapping for known wallets
// Fallback data when backend doesn't return Twitter info
const WALLET_TWITTER_MAP: Record<string, {
  twitterUsername: string;
  twitterName: string;
  twitterAvatar: string;
  twitterFollowers?: number;
  twitterVerified?: boolean;
}> = {
  // Cupsey - verified from TwitterAPI.io
  "6CPRX2qdoVHXyqJ43uDuMCTHmB63ZRXUHqCpzxqUxaWs": {
    twitterUsername: "cupseyy",
    twitterName: "Cupsey",
    twitterAvatar: "https://pbs.twimg.com/profile_images/1878584793249583104/WMH0-IGY_400x400.jpg",
    twitterFollowers: 183384,
    twitterVerified: false,
  },
  // Loopier - placeholder until correct handle found
  "8YCdowALgH5b3rb87YixjCbQMKdfUHmGKvAPavFHLguH": {
    twitterUsername: "loopier",
    twitterName: "Loopier",
    twitterAvatar: "https://pbs.twimg.com/profile_images/1867638877310816257/xfY2XWMR_400x400.jpg",
    twitterFollowers: 89000,
    twitterVerified: false,
  },
  // Pow - verified from TwitterAPI.io
  "J6TDXvarvpBdPXTaTU8eJbtso1PUCYKGkVtMKUUY8iEa": {
    twitterUsername: "pow_xbt",
    twitterName: "pow🧲",
    twitterAvatar: "https://pbs.twimg.com/profile_images/2006851277851160576/L8vAUJOH_400x400.jpg",
    twitterFollowers: 155019,
    twitterVerified: false,
  },
  // Pain - placeholder until correct handle found
  "DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm": {
    twitterUsername: "pain",
    twitterName: "Pain",
    twitterAvatar: "https://pbs.twimg.com/profile_images/1868308826286870528/KLqYT8sV_400x400.jpg",
    twitterFollowers: 95000,
    twitterVerified: false,
  },
  // Gake - verified from TwitterAPI.io
  "ATFRUwvyMh61w2Ab6AZxUyxsAfiiuG1RqL6iv3Vi9q2B": {
    twitterUsername: "gaborux",
    twitterName: "gake",
    twitterAvatar: "https://pbs.twimg.com/profile_images/2007657851423207431/binqODel_400x400.jpg",
    twitterFollowers: 169490,
    twitterVerified: false,
  },
};

// Enrich wallet with hardcoded Twitter data if available
function enrichWalletWithTwitterData(wallet: TrackedWallet): TrackedWallet {
  const twitterData = WALLET_TWITTER_MAP[wallet.address];
  if (twitterData && !wallet.twitterUsername) {
    return {
      ...wallet,
      twitterUsername: twitterData.twitterUsername,
      twitterName: twitterData.twitterName,
      twitterAvatar: twitterData.twitterAvatar,
      twitterFollowers: twitterData.twitterFollowers,
      twitterVerified: twitterData.twitterVerified,
    };
  }
  return wallet;
}

// Wallet Row Component - Polished branded design
function WalletRow({
  wallet,
  onClick,
}: {
  wallet: TrackedWallet;
  onClick: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className="relative flex items-center gap-4 px-5 py-4 rounded-2xl bg-black border border-white/5 cursor-pointer overflow-hidden group"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at center, ${BRAND_GREEN}08 0%, transparent 70%)`,
        }}
      />

      {/* Border glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 0 1px ${BRAND_GREEN}30, 0 0 20px ${BRAND_GREEN}10`,
        }}
      />

      {/* Avatar with green ring on active */}
      <div className="relative z-10 flex-shrink-0">
        {wallet.twitterAvatar ? (
          <div
            className="relative w-14 h-14 rounded-full p-[2px]"
            style={{
              background: wallet.active
                ? `linear-gradient(135deg, ${BRAND_GREEN}, ${BRAND_GREEN}60)`
                : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            }}
          >
            <img
              src={wallet.twitterAvatar}
              alt={wallet.label}
              className="w-full h-full rounded-full object-cover bg-black"
            />
            {/* Active pulse indicator */}
            {wallet.active && (
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: BRAND_GREEN }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-2 h-2 rounded-full bg-black" />
              </motion.div>
            )}
          </div>
        ) : (
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center text-base font-bold bg-black border-2"
            style={{
              borderColor: wallet.active ? BRAND_GREEN : 'rgba(255,255,255,0.1)',
              color: wallet.active ? BRAND_GREEN : 'rgba(255,255,255,0.5)',
            }}
          >
            {wallet.label.slice(0, 2).toUpperCase()}
            {wallet.active && (
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: BRAND_GREEN }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-2 h-2 rounded-full bg-black" />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Name and Twitter Handle */}
      <div className="relative z-10 flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white text-base truncate">
            {wallet.twitterName || wallet.label}
          </p>
          {wallet.twitterVerified && (
            <span style={{ color: BRAND_GREEN }} title="Verified">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 flex-shrink-0"
              >
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.435.716 2.69 1.782 3.407-.123.498-.192 1.02-.192 1.553 0 2.98 2.42 5.4 5.4 5.4.61 0 1.19-.11 1.734-.312.637.586 1.48.947 2.412.947 1.836 0 3.325-1.39 3.522-3.218.42-.03.835-.115 1.235-.247 1.91.95 4.263-.44 4.263-2.583 0-.53-.07-1.05-.192-1.553 1.066-.717 1.782-1.972 1.782-3.407zM10.153 15.65c-.244.25-.64.25-.884 0l-3.004-3.04c-.243-.246-.243-.646 0-.892.244-.245.64-.245.884 0l2.56 2.592 5.37-5.434c.244-.246.64-.246.883 0 .244.246.244.646 0 .892l-5.81 5.88z" />
              </svg>
            </span>
          )}
        </div>
        {wallet.twitterUsername && (
          <span
            className="text-sm font-medium truncate"
            style={{ color: `${BRAND_GREEN}99` }}
          >
            @{wallet.twitterUsername}
          </span>
        )}
        {wallet.twitterFollowers !== undefined && wallet.twitterFollowers !== null && (
          <span className="text-xs text-white/30">
            {wallet.twitterFollowers.toLocaleString()} followers
          </span>
        )}
      </div>

      {/* Arrow indicator on hover */}
      <motion.div
        className="relative z-10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ color: BRAND_GREEN }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// Modal Component
function WalletModal({
  wallet,
  signals,
  positions,
  onClose,
}: {
  wallet: TrackedWallet;
  signals: TradingSignal[];
  positions: Position[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Filter signals for this wallet
  const walletSignals = signals.filter((s) => s.walletId === wallet.id);

  // Filter positions by matching linked signals
  const walletPositions = positions.filter((p) =>
    signals.find((s) => s.id === p.signalId)?.walletId === wallet.id
  );

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-black border shadow-2xl"
        style={{
          borderColor: `${BRAND_GREEN}20`,
          boxShadow: `0 0 60px ${BRAND_GREEN}10`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between" style={{ borderColor: `${BRAND_GREEN}15` }}>
          <div className="flex items-center gap-6">
            {/* Large Avatar with brand green ring */}
            <div
              className="relative w-24 h-24 rounded-full p-[3px]"
              style={{
                background: wallet.active
                  ? `linear-gradient(135deg, ${BRAND_GREEN}, ${BRAND_GREEN}60)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
              }}
            >
              {wallet.twitterAvatar ? (
                <img
                  src={wallet.twitterAvatar}
                  alt={wallet.label}
                  className="w-full h-full rounded-full object-cover bg-black"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-3xl font-bold" style={{ color: BRAND_GREEN }}>
                  {wallet.label.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {wallet.twitterName || wallet.label}
                {wallet.twitterVerified && (
                  <span style={{ color: BRAND_GREEN }} title="Verified">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.435.716 2.69 1.782 3.407-.123.498-.192 1.02-.192 1.553 0 2.98 2.42 5.4 5.4 5.4.61 0 1.19-.11 1.734-.312.637.586 1.48.947 2.412.947 1.836 0 3.325-1.39 3.522-3.218.42-.03.835-.115 1.235-.247 1.91.95 4.263-.44 4.263-2.583 0-.53-.07-1.05-.192-1.553 1.066-.717 1.782-1.972 1.782-3.407zM10.153 15.65c-.244.25-.64.25-.884 0l-3.004-3.04c-.243-.246-.243-.646 0-.892.244-.245.64-.245.884 0l2.56 2.592 5.37-5.434c.244-.246.64-.246.883 0 .244.246.244.646 0 .892l-5.81 5.88z" />
                    </svg>
                  </span>
                )}
              </h2>

              <div className="flex items-center gap-3 mt-1">
                {wallet.twitterUsername ? (
                  <a
                    href={`https://twitter.com/${wallet.twitterUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: BRAND_GREEN }}
                  >
                    @{wallet.twitterUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-500">No Twitter linked</span>
                )}

                {wallet.twitterFollowers !== undefined &&
                  wallet.twitterFollowers !== null && (
                    <span className="text-gray-400 text-sm">
                      • {wallet.twitterFollowers.toLocaleString()} followers
                    </span>
                  )}
              </div>

              {wallet.twitterBio && (
                <p className="text-gray-400 mt-2 max-w-xl text-sm line-clamp-2">
                  {wallet.twitterBio}
                </p>
              )}

              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500 font-mono">
                  {wallet.address}
                </span>
                <button
                  onClick={copyAddress}
                  className="text-gray-500 hover:text-white transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-3 h-3" style={{ color: BRAND_GREEN }} />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <a
                  href={`https://solscan.io/account/${wallet.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: BRAND_GREEN }}
                  title="View on Solscan"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Close button only */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Signals Table */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Trading Signals ({walletSignals.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="p-3">Token</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Strength</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {walletSignals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-gray-500"
                      >
                        No recent signals found for this wallet
                      </td>
                    </tr>
                  ) : (
                    walletSignals.map((sig) => (
                      <tr key={sig.id} className="hover:bg-white/5">
                        <td className="p-3 text-white font-mono text-sm">
                          {sig.tokenSymbol || sig.tokenMint.slice(0, 8)}
                        </td>
                        <td className="p-3 text-gray-300 text-sm">
                          {formatSol(sig.buyAmountSol)}
                        </td>
                        <td
                          className={`p-3 text-sm font-semibold ${getStrengthColor(
                            sig.signalStrength
                          )}`}
                        >
                          {sig.signalStrength}
                        </td>
                        <td className="p-3 text-gray-400 text-sm max-w-xs truncate">
                          {sig.narrativeNotes || "—"}
                        </td>
                        <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
                          {formatDate(sig.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Positions Table */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Positions Taken ({walletPositions.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="p-3">Token</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Entry</th>
                    <th className="p-3">Target/SL</th>
                    <th className="p-3">P&L</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {walletPositions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-gray-500"
                      >
                        No recent positions found for this wallet
                      </td>
                    </tr>
                  ) : (
                    walletPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-white/5">
                        <td className="p-3 text-white font-mono text-sm">
                          {pos.tokenSymbol || pos.tokenMint.slice(0, 8)}
                        </td>
                        <td
                          className={`p-3 text-sm font-medium ${getStatusColor(
                            pos.status
                          )}`}
                        >
                          {pos.status}
                        </td>
                        <td className="p-3 text-gray-300 text-sm">
                          {formatSol(pos.entryAmountSol)}
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex gap-2">
                            <span
                              className={
                                pos.target1Hit
                                  ? "text-green-400"
                                  : "text-gray-600"
                              }
                            >
                              T1
                            </span>
                            <span
                              className={
                                pos.target2Hit
                                  ? "text-green-400"
                                  : "text-gray-600"
                              }
                            >
                              T2
                            </span>
                            <span
                              className={
                                pos.stoppedOut
                                  ? "text-red-400"
                                  : "text-gray-600"
                              }
                            >
                              SL
                            </span>
                          </div>
                        </td>
                        <td
                          className={`p-3 text-sm font-bold ${
                            pos.realizedPnlSol >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {pos.realizedPnlSol >= 0 ? "+" : ""}
                          {formatSol(pos.realizedPnlSol)}
                        </td>
                        <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
                          {formatDate(pos.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Main Panel Component
export function TrackedWalletsPanel() {
  const { wallets, signals, isLoading } = useRealTimeWalletSignals();
  const { positions } = useRealTimePositions();
  const [selectedWallet, setSelectedWallet] = useState<TrackedWallet | null>(null);

  // Enrich wallets with hardcoded Twitter data
  const enrichedWallets = wallets.map(enrichWalletWithTwitterData);

  return (
    <>
      <Panel>
        <div className="flex items-center gap-3 mb-5">
          {/* Glowing icon container */}
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: `${BRAND_GREEN}15`,
              boxShadow: `0 0 20px ${BRAND_GREEN}20`,
            }}
          >
            <Users className="w-5 h-5" style={{ color: BRAND_GREEN }} />
          </div>

          {/* Shiny animated title */}
          <div>
            <ShinyText
              text="Smart Money"
              className="text-xl font-bold tracking-tight"
              speed={4}
            />
            <p className="text-xs text-white/40 mt-0.5">
              {enrichedWallets.length} tracked wallet{enrichedWallets.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {isLoading && enrichedWallets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-white/50" />
            </div>
          ) : enrichedWallets.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-4">
              No wallets tracked
            </p>
          ) : (
            enrichedWallets.map((wallet) => (
              <WalletRow
                key={wallet.id}
                wallet={wallet}
                onClick={() => setSelectedWallet(wallet)}
              />
            ))
          )}
        </div>
      </Panel>

      {/* Modal */}
      <AnimatePresence>
        {selectedWallet && (
          <WalletModal
            wallet={enrichWalletWithTwitterData(selectedWallet)}
            signals={signals}
            positions={positions}
            onClose={() => setSelectedWallet(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
