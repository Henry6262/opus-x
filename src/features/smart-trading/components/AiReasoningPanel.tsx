"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Droplets,
  Activity,
} from "lucide-react";
import type { MigrationAnalysis, AiDecision } from "../types";

type TimeTranslator = (key: string, params?: Record<string, string | number | Date>) => string;

interface AiReasoningPanelProps {
  analyses: MigrationAnalysis[];
  currentDecision?: AiDecision | null;
  isLoading?: boolean;
}

const DECISION_STYLES: Record<AiDecision, { color: string; bg: string; border: string }> = {
  ENTER: {
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  WAIT: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  PASS: {
    color: "text-white/40",
    bg: "bg-white/5",
    border: "border-white/10",
  },
};

const TRIGGER_KEYS: Record<string, string> = {
  SCHEDULED: "scheduled",
  WALLET_SIGNAL: "walletSignal",
  MIGRATION: "migration",
  PRICE_SPIKE: "priceSpike",
};

export function AiReasoningPanel({
  analyses,
  currentDecision,
  isLoading = false,
}: AiReasoningPanelProps) {
  const t = useTranslations("ai");
  const tTime = useTranslations("time");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-[#c4f70e] animate-pulse" />
          <span className="text-sm text-white/60">{t("loading")}</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Brain className="w-8 h-8 text-white/20 mb-2" />
          <p className="text-sm text-white/40">{t("noAnalysis")}</p>
          <p className="text-xs text-white/30 mt-1">
            {t("analysisWillAppear")}
          </p>
        </div>
      </div>
    );
  }

  const getTriggerLabel = (triggerType: string): string => {
    const key = TRIGGER_KEYS[triggerType];
    return key ? t(`triggers.${key}`) : triggerType;
  };

  return (
    <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#c4f70e]" />
            <span className="font-medium text-white">{t("history")}</span>
          </div>
          {currentDecision && (
            <div
              className={`px-2 py-1 rounded-md text-xs font-medium ${DECISION_STYLES[currentDecision].bg} ${DECISION_STYLES[currentDecision].color}`}
            >
              {t("current", { decision: currentDecision })}
            </div>
          )}
        </div>
      </div>

      {/* Analysis list */}
      <div className="divide-y divide-white/5">
        {analyses.map((analysis, index) => {
          const isExpanded = expandedId === analysis.id;
          const isLatest = index === 0;
          const style = DECISION_STYLES[analysis.decision];

          return (
            <motion.div
              key={analysis.id}
              initial={isLatest ? { opacity: 0, y: -10 } : false}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              {/* Collapsed view */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : analysis.id)}
                className="w-full p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Decision badge */}
                  <div
                    className={`flex items-center gap-2 px-2 py-1 rounded-md ${style.bg} ${style.border} border`}
                  >
                    <span className={`text-sm font-bold ${style.color}`}>
                      {analysis.decision}
                    </span>
                    <span className="text-xs text-white/40">
                      {Math.round(analysis.confidence * 100)}%
                    </span>
                  </div>

                  {/* Time and trigger */}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="px-1.5 py-0.5 rounded bg-white/5">
                      {getTriggerLabel(analysis.triggerType)}
                    </span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimeAgo(analysis.createdAt, tTime)}</span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""
                        }`}
                    />
                  </div>
                </div>

                {/* Reasoning preview */}
                {!isExpanded && (
                  <p className="mt-2 text-sm text-white/60 line-clamp-2">
                    {analysis.reasoning}
                  </p>
                )}
              </button>

              {/* Expanded view */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      {/* Full reasoning */}
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">
                          {t("reasoning")}
                        </span>
                        <p className="mt-1 text-sm text-white/70">
                          {analysis.reasoning}
                        </p>
                      </div>

                      {/* Market snapshot */}
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">
                          {t("marketSnapshot")}
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                          <MetricBox
                            icon={<Activity className="w-3.5 h-3.5" />}
                            label={t("metrics.price")}
                            value={`$${analysis.priceUsd.toFixed(6)}`}
                          />
                          <MetricBox
                            icon={<BarChart3 className="w-3.5 h-3.5" />}
                            label={t("metrics.mcap")}
                            value={formatCompact(analysis.marketCap)}
                          />
                          <MetricBox
                            icon={<Droplets className="w-3.5 h-3.5" />}
                            label={t("metrics.liquidity")}
                            value={formatCompact(analysis.liquidity)}
                          />
                          {analysis.volume24h !== null && (
                            <MetricBox
                              icon={<TrendingUp className="w-3.5 h-3.5" />}
                              label={t("metrics.volume24h")}
                              value={formatCompact(analysis.volume24h)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Risks */}
                      {analysis.risks.length > 0 && (
                        <div>
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">
                            {t("riskFactors")}
                          </span>
                          <div className="mt-2 space-y-1.5">
                            {analysis.risks.map((risk, riskIndex) => (
                              <div
                                key={riskIndex}
                                className="flex items-start gap-2 text-sm text-amber-400/80"
                              >
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Confidence bar */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-white/40 uppercase tracking-wider">
                            {t("confidence")}
                          </span>
                          <span className={style.color}>
                            {Math.round(analysis.confidence * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysis.confidence * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${analysis.decision === "ENTER"
                                ? "bg-gradient-to-r from-green-500 to-green-400"
                                : analysis.decision === "WAIT"
                                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                  : "bg-white/30"
                              }`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MetricBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-2 rounded-lg bg-white/5">
      <div className="flex items-center gap-1.5 text-white/40 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-sm font-mono text-white">{value}</span>
    </div>
  );
}

function formatTimeAgo(dateStr: string, t: TimeTranslator): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 5) return t("justNow");
  if (diffSecs < 60) return t("secondsAgo", { count: diffSecs });
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return t("minutesAgo", { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t("hoursAgo", { count: diffHours });
  return t("daysAgo", { count: Math.floor(diffHours / 24) });
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}
