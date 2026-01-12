"use client";

import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
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
import { useWalletSignals, usePositions } from "../context";
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
const PRESET_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const TRACKED_WALLET_PRESETS: Array<{ address: string; label?: string }> = [
  { address: "As7HjL7dzzvbRbaD3WCun47robib2kmAKRXMvjHkSMB5", label: "otta" },
  { address: "87rRdssFiTJKY4MGARa4G5vQ31hmR7MxSmhzeaJ5AAxJ", label: "Dior" },
  { address: "2chb7q48B8r69QsUj4sBGnumis4g2DURP7Uru9aka2My", label: "Ton" },
  { address: "6CPRX2qdoVHXyqJ43uDuMCTHmB63ZRXUHqCpzxqUxaWs", label: "Loopier Side" },
  { address: "76ZUBj1JLz7arTVHSRJok5oSTEqDuVBgySFMVHtzxzZc", label: "temu gake" },
  { address: "J23qr98GjGJJqKq9CBEnyRhHbmkaVxtTJNNxKu597wsA", label: "Gr3g" },
  { address: "J6TDXvarvpBdPXTaTU8eJbtso1PUCYKGkVtMKUUY8iEa", label: "Pain" },
  { address: "BAr5csYtpWoNpwhUjixX7ZPHXkUciFZzjBp9uNxZXJPh", label: "Jack Duval" },
  { address: "2X4H5Y9C4Fy6Pf3wpq8Q4gMvLcWvfrrwDv2bdR8AAwQv", label: "Orange" },
  { address: "8YCdowALgH5b3rb87YixjCbQMKdfUHmGKvAPavFHLguH", label: "POW" },
  { address: "5XVKfruE4Zzeoz3aqBQfFMb5aSscY5nSyc6VwtQwNiid", label: "ILY" },
  { address: "BZmxuXQ68QeZABbDFSzveHyrXCv5EG6Ut1ATw5qZgm2Q", label: "Insider" },
  { address: "2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f", label: "Cupsey" },
];

const PRESET_LABEL_BY_ADDRESS = TRACKED_WALLET_PRESETS.reduce<Record<string, string>>((acc, preset) => {
  if (preset.label) acc[preset.address] = preset.label;
  return acc;
}, {});

const PRESET_TRACKED_WALLETS: TrackedWallet[] = TRACKED_WALLET_PRESETS.map((preset) => ({
  id: `preset-${preset.address}`,
  address: preset.address,
  label: preset.label ?? "Rando Router",
  active: true,
  createdAt: PRESET_TIMESTAMP,
  updatedAt: PRESET_TIMESTAMP,
}));

// Hardcoded Twitter profile mapping for known wallets
// Fallback data when backend doesn't return Twitter info
const WALLET_TWITTER_MAP: Record<string, {
  twitterUsername?: string;
  twitterName?: string;
  twitterAvatar?: string;
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
  "2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f": {
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
      twitterName: twitterData.twitterName ?? wallet.label,
      twitterAvatar: twitterData.twitterAvatar,
      twitterFollowers: twitterData.twitterFollowers,
      twitterVerified: twitterData.twitterVerified,
    };
  }
  return wallet;
}

function normalizeWalletLabel(wallet: TrackedWallet): TrackedWallet {
  const trimmed = wallet.label?.trim();
  const fallback = PRESET_LABEL_BY_ADDRESS[wallet.address];
  const label =
    trimmed && trimmed.length > 0 && trimmed !== wallet.address
      ? trimmed
      : fallback || "Rando Router";

  return {
    ...wallet,
    label,
  };
}

function getWalletDisplayLabel(wallet: TrackedWallet) {
  return wallet.twitterName || wallet.label || PRESET_LABEL_BY_ADDRESS[wallet.address] || "Rando Router";
}

// Wallet Row Component - Polished branded design
function WalletRow({
  wallet,
  onClick,
  tCommon,
}: {
  wallet: TrackedWallet;
  onClick: () => void;
  tCommon: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const shortAddress = useMemo(() => wallet.address.slice(0, 4).toUpperCase(), [wallet.address]);
  const displayLabel = getWalletDisplayLabel(wallet);

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Failed to copy wallet address", err);
    }
  };

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
            {displayLabel.slice(0, 2).toUpperCase()}
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-white text-base truncate">
            {displayLabel}
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
            {wallet.twitterFollowers.toLocaleString()} {tCommon("followers")}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-[11px] font-mono text-white/80 tracking-[0.25em] hover:text-white hover:border-white/40 transition-colors"
          aria-label="Copy wallet address"
        >
          <span>{shortAddress}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#c4f70e]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
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
  tWallets,
  tCommon,
  tSmartTrading,
  tSignals,
}: {
  wallet: TrackedWallet;
  signals: TradingSignal[];
  positions: Position[];
  onClose: () => void;
  tWallets: (key: string) => string;
  tCommon: (key: string) => string;
  tSmartTrading: (key: string) => string;
  tSignals: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const displayLabel = getWalletDisplayLabel(wallet);

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
                  alt={displayLabel}
                  className="w-full h-full rounded-full object-cover bg-black"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-3xl font-bold" style={{ color: BRAND_GREEN }}>
                  {displayLabel.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {displayLabel}
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
                  <span className="text-gray-500">{tWallets("noTwitterLinked")}</span>
                )}

                {wallet.twitterFollowers !== undefined &&
                  wallet.twitterFollowers !== null && (
                    <span className="text-gray-400 text-sm">
                      • {wallet.twitterFollowers.toLocaleString()} {tCommon("followers")}
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
              {tWallets("tradingSignals")} ({walletSignals.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="p-3">{tCommon("token")}</th>
                    <th className="p-3">{tCommon("amount")}</th>
                    <th className="p-3">{tWallets("strength")}</th>
                    <th className="p-3">{tSignals("notes")}</th>
                    <th className="p-3">{tCommon("time")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {walletSignals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-gray-500"
                      >
                        {tWallets("noSignalsFound")}
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
              {tWallets("positionsTaken")} ({walletPositions.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="p-3">{tCommon("token")}</th>
                    <th className="p-3">{tCommon("status")}</th>
                    <th className="p-3">{tSmartTrading("position.entry")}</th>
                    <th className="p-3">{tSmartTrading("position.targetSl")}</th>
                    <th className="p-3">{tSmartTrading("position.pnl")}</th>
                    <th className="p-3">{tCommon("time")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {walletPositions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-gray-500"
                      >
                        {tWallets("noPositionsFound")}
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
  const tWallets = useTranslations("wallets");
  const tCommon = useTranslations("common");
  const tSmartTrading = useTranslations("smartTrading");
  const tSignals = useTranslations("signals");

  const { wallets, signals, isLoading } = useWalletSignals();
  const { positions } = usePositions();
  const [selectedWallet, setSelectedWallet] = useState<TrackedWallet | null>(null);

  const mergedWallets = useMemo(() => {
    const map = new Map<string, TrackedWallet>();

    wallets.forEach((wallet) => {
      map.set(wallet.address, normalizeWalletLabel(wallet));
    });

    PRESET_TRACKED_WALLETS.forEach((preset) => {
      if (!map.has(preset.address)) {
        map.set(preset.address, normalizeWalletLabel(preset));
      }
    });

    return Array.from(map.values());
  }, [wallets]);

  // Enrich wallets with hardcoded Twitter data
  const enrichedWallets = useMemo(
    () => mergedWallets.map(enrichWalletWithTwitterData),
    [mergedWallets]
  );

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
              text={tWallets("title")}
              className="text-xl font-bold tracking-tight"
              speed={4}
            />
            <p className="text-xs text-white/40 mt-0.5">
              {enrichedWallets.length} {enrichedWallets.length !== 1 ? tWallets("trackedWallets") : tWallets("trackedWallet")}
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
              {tWallets("noWallets")}
            </p>
          ) : (
            enrichedWallets.map((wallet) => (
              <WalletRow
                key={wallet.id}
                wallet={wallet}
                onClick={() => setSelectedWallet(wallet)}
                tCommon={tCommon}
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
            tWallets={tWallets}
            tCommon={tCommon}
            tSmartTrading={tSmartTrading}
            tSignals={tSignals}
          />
        )}
      </AnimatePresence>
    </>
  );
}
