"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, RefreshCw, Zap } from "lucide-react";
import { buildDevprntApiUrl } from "@/lib/devprnt";
import { useSharedWebSocket } from "@/hooks/useWebSocket";
import {
    PositionProgressCard,
    type PositionData,
    type PriceUpdateEvent,
    type TakeProfitEvent,
} from "./PositionProgressCard";

// ============================================
// Types for API Response
// ============================================

interface ApiPosition {
    id: string;
    mint: string;
    ticker: string;
    token_name: string;
    entry_price: number;
    entry_sol_value: number;
    entry_time: string;
    current_price: number;
    current_quantity: number;
    initial_quantity: number;
    unrealized_pnl_pct: number;
    unrealized_pnl_sol: number;
    peak_pnl_pct: number;
    targets_hit: Array<{ target_index: number; timestamp: string }>;
    status: string;
    buy_signature?: string;
}

interface WsMessage {
    type: string;
    [key: string]: unknown;
}

// ============================================
// Active Positions Panel
// ============================================

interface ActivePositionsPanelProps {
    maxPositions?: number;
}

export function ActivePositionsPanel({ maxPositions = 10 }: ActivePositionsPanelProps) {
    const [positions, setPositions] = useState<PositionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const wsUrl = buildDevprntApiUrl("/ws/trading").toString().replace("https", "wss").replace("http", "ws");
    const { lastMessage, isConnected } = useSharedWebSocket(wsUrl);

    const fetchPositions = useCallback(async () => {
        try {
            const url = buildDevprntApiUrl("/api/trading/positions");
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            const mapped: PositionData[] = (result.data || [])
                .filter((p: ApiPosition) => p.status === "open" || p.status === "partially_closed")
                .slice(0, maxPositions)
                .map((p: ApiPosition) => ({
                    mint: p.mint,
                    ticker: p.ticker,
                    token_name: p.token_name,
                    entry_price: p.entry_price,
                    entry_sol_value: p.entry_sol_value,
                    entry_time: p.entry_time,
                    current_price: p.current_price,
                    multiplier: p.current_price / p.entry_price,
                    pnl_pct: p.unrealized_pnl_pct,
                    pnl_sol: p.unrealized_pnl_sol,
                    peak_pnl_pct: p.peak_pnl_pct,
                    next_target: calcNextTarget(p.targets_hit),
                    target_progress: calcProgress(p.current_price, p.entry_price, p.targets_hit),
                    targets_hit: (p.targets_hit || []).map((t) => t.target_index),
                    buy_signature: p.buy_signature,
                }));

            setPositions(mapped);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch positions:", err);
            setError("Failed to load");
        } finally {
            setIsLoading(false);
        }
    }, [maxPositions]);

    useEffect(() => {
        fetchPositions();
        const interval = setInterval(fetchPositions, 30000);
        return () => clearInterval(interval);
    }, [fetchPositions]);

    useEffect(() => {
        if (!lastMessage) return;
        try {
            const event: WsMessage = JSON.parse(lastMessage);
            if (event.type === "price_update") {
                const e = event as unknown as PriceUpdateEvent;
                setPositions((prev) =>
                    prev.map((pos) =>
                        pos.mint !== e.mint ? pos : {
                            ...pos,
                            current_price: e.price,
                            multiplier: e.multiplier,
                            pnl_pct: e.pnl_pct,
                            pnl_sol: e.pnl_sol,
                            peak_pnl_pct: e.peak_pnl_pct,
                            next_target: e.next_target,
                            target_progress: e.target_progress,
                        }
                    )
                );
            } else if (event.type === "position_opened") {
                fetchPositions();
            } else if (event.type === "position_closed") {
                const c = event as { mint: string };
                setPositions((prev) => prev.filter((p) => p.mint !== c.mint));
            } else if (event.type === "take_profit_triggered") {
                const tp = event as unknown as TakeProfitEvent;
                setPositions((prev) =>
                    prev.map((pos) =>
                        pos.mint !== tp.mint ? pos : {
                            ...pos,
                            targets_hit: [...new Set([...pos.targets_hit, getIdx(tp.target_multiplier)])],
                        }
                    )
                );
            }
        } catch (err) {
            console.error("WS parse error:", err);
        }
    }, [lastMessage, fetchPositions]);

    return (
        <div className="rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#c4f70e]" />
                    <span className="text-sm font-medium text-white">Active Positions</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#c4f70e]/20 text-[#c4f70e]">
                        {positions.length}
                    </span>
                    {isConnected && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-green-500/20 text-green-400">
                            <Zap className="w-2.5 h-2.5" />LIVE
                        </span>
                    )}
                </div>
                <button onClick={fetchPositions} disabled={isLoading} className="p-1 hover:bg-white/10 rounded">
                    <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>
            <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                {error && <div className="text-center py-4 text-red-400 text-sm">{error}</div>}
                {!error && positions.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                        <Target className="w-10 h-10 mb-3 opacity-50" />
                        <span className="text-sm">No active positions</span>
                        <span className="text-xs text-white/30 mt-1">Trades will appear when bot opens positions</span>
                    </div>
                )}
                <AnimatePresence mode="popLayout">
                    {positions.map((pos) => <PositionProgressCard key={pos.mint} position={pos} />)}
                </AnimatePresence>
            </div>
        </div>
    );
}

const TP = [1.5, 2.0, 3.0];
function calcNextTarget(hits: Array<{ target_index: number }>): number | null {
    const h = (hits || []).map((t) => t.target_index);
    for (let i = 0; i < TP.length; i++) if (!h.includes(i + 1)) return TP[i];
    return null;
}
function calcProgress(cur: number, entry: number, hits: Array<{ target_index: number }>): number | null {
    const next = calcNextTarget(hits);
    if (!next) return null;
    const prev = (hits || []).length > 0 ? TP[(hits || []).length - 1] : 1;
    return Math.min(Math.max((cur / entry - prev) / (next - prev), 0), 1);
}
function getIdx(m: number): number { const i = TP.indexOf(m); return i >= 0 ? i + 1 : 1; }

export default ActivePositionsPanel;
