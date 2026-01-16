"use client";

/**
 * AI Reasoning Stream Hook
 * 
 * Bridges WebSocket events directly to the terminal for live streaming
 * of AI reasoning, analysis, and decision-making processes.
 * 
 * This hook subscribes to AI-related WebSocket events and pipes them
 * directly to the terminal with streaming typewriter effect.
 */

import { useEffect, useCallback, useRef } from "react";
import { useTerminal } from "../TerminalProvider";
import {
    generateMessage,
    getCategoryColor,
    getCategoryIcon,
    shouldStream,
    type MessageCategory,
} from "../ai-personality";
import { resolveEvent, type TerminalEvent } from "../terminal-events";

interface UseAiReasoningStreamProps {
    /** Whether streaming is enabled */
    enabled?: boolean;
    /** Maximum number of thinking steps to show per token */
    maxThinkingSteps?: number;
    /** Minimum interval between AI messages (ms) */
    throttleMs?: number;
}

/** AI reasoning event from /ws/trading/reasoning */
interface AiReasoningEvent {
    symbol: string;
    mint: string;
    reasoning: string;
    conviction: number;
    will_trade: boolean;
    timestamp: number;
}

/** No market data event from /ws/trading/reasoning */
interface NoMarketDataEvent {
    symbol: string;
    mint: string;
    reason: string;
    timestamp: number;
}

interface PriceUpdateEvent {
    mint: string;
    ticker?: string;
    price: number;
    multiplier: number;
    pnl_pct: number;
}

interface PositionEvent {
    tokenMint?: string;
    mint?: string;
    symbol?: string;
    ticker?: string;
    tokenSymbol?: string;
    entry_price?: number;
    entryPrice?: number;
    target_multiplier?: number;
    realized?: number;
    reason?: string;
    total_pnl_sol?: number;
}

export function useAiReasoningStream({
    enabled = true,
    maxThinkingSteps = 5,
    throttleMs = 1000,
}: UseAiReasoningStreamProps = {}): void {
    const { log, startThinking, stopThinking, setThinkingStep } = useTerminal();
    const lastMessageTimeRef = useRef<number>(0);
    const thinkingCountRef = useRef<Map<string, number>>(new Map());

    // Throttled log function
    const throttledLog = useCallback(
        (
            event: TerminalEvent,
            force = false
        ) => {
            const now = Date.now();
            if (!force && now - lastMessageTimeRef.current < throttleMs) {
                return;
            }

            const { category, context } = resolveEvent(event);
            const text = generateMessage(category, context);
            const color = getCategoryColor(category);
            const icon = getCategoryIcon(category);
            const isStreaming = shouldStream(category);

            log({ text, color, icon, isStreaming, type: "standard" });
            lastMessageTimeRef.current = now;
        },
        [log, throttleMs]
    );

    // Log a thinking step with indentation
    const logThinkingStep = useCallback(
        (tokenSymbol: string, step: string) => {
            const count = thinkingCountRef.current.get(tokenSymbol) || 0;
            if (count >= maxThinkingSteps) return;

            thinkingCountRef.current.set(tokenSymbol, count + 1);

            log({
                text: `  ├─ ${step}`,
                color: "var(--text-secondary)",
                isStreaming: false,
                type: "thinking-step",
            });
        },
        [log, maxThinkingSteps]
    );

    // Parse and emit AI reasoning as multiple thinking steps
    const emitAiReasoning = useCallback(
        (data: AiReasoningEvent) => {
            const symbol = data.symbol || data.mint.slice(0, 8);

            // Reset thinking count for this token
            thinkingCountRef.current.set(symbol, 0);

            // Start thinking indicator
            startThinking(symbol);

            // Emit thinking start
            throttledLog(
                {
                    type: "ai:thinking_start",
                    data: { tokenSymbol: symbol },
                    priority: "high",
                },
                true
            );

            // Parse the reasoning into steps if it contains multiple sentences
            const reasoningParts = data.reasoning
                .split(/[.!?]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            // Emit reasoning steps with delays
            let delay = 300;
            reasoningParts.slice(0, maxThinkingSteps).forEach((part) => {
                setTimeout(() => {
                    logThinkingStep(symbol, part);
                    setThinkingStep(part);
                }, delay);
                delay += 400 + Math.random() * 200;
            });

            // Emit conviction score
            setTimeout(() => {
                throttledLog(
                    {
                        type: "ai:confidence_score",
                        data: {
                            tokenSymbol: symbol,
                            confidence: Math.round(data.conviction * 100),
                            factors: data.will_trade ? "WILL TRADE" : "PASS",
                        },
                        priority: "normal",
                    },
                    true
                );
            }, delay);

            // Emit final verdict
            setTimeout(() => {
                throttledLog(
                    {
                        type: "ai:final_verdict",
                        data: {
                            tokenSymbol: symbol,
                            confidence: Math.round(data.conviction * 100),
                            verdict: data.will_trade ? "BUY" : "SKIP",
                        },
                        priority: "high",
                    },
                    true
                );
                stopThinking();
            }, delay + 500);
        },
        [throttledLog, logThinkingStep, startThinking, stopThinking, setThinkingStep, maxThinkingSteps]
    );

    // Handle no market data events
    const emitNoMarketData = useCallback(
        (data: NoMarketDataEvent) => {
            const symbol = data.symbol || data.mint.slice(0, 8);

            throttledLog(
                {
                    type: "ai:no_market_data",
                    data: {
                        tokenSymbol: symbol,
                        reason: data.reason,
                    },
                    priority: "low",
                },
                false
            );
        },
        [throttledLog]
    );

    // Subscribe to WebSocket events via custom event system
    useEffect(() => {
        if (!enabled) return;

        // Custom event handlers for AI-related WebSocket events
        const handleAiReasoning = (event: CustomEvent<AiReasoningEvent>) => {
            emitAiReasoning(event.detail);
        };

        const handleNoMarketData = (event: CustomEvent<NoMarketDataEvent>) => {
            emitNoMarketData(event.detail);
        };

        const handlePriceUpdate = (event: CustomEvent<PriceUpdateEvent>) => {
            const data = event.detail;
            if (Math.abs(data.pnl_pct) > 10) {
                // Only show significant price movements
                throttledLog({
                    type: "position:price_update",
                    data: {
                        tokenSymbol: data.ticker || data.mint.slice(0, 8),
                        price: data.price,
                        pnl: data.pnl_pct,
                    },
                    priority: "normal",
                });
            }
        };

        const handlePositionOpened = (event: CustomEvent<PositionEvent>) => {
            const data = event.detail;
            const symbol = data.symbol || data.ticker || data.tokenSymbol ||
                data.tokenMint?.slice(0, 8) || data.mint?.slice(0, 8) || "Unknown";

            throttledLog(
                {
                    type: "position:opened",
                    data: {
                        tokenSymbol: symbol,
                        price: data.entry_price || data.entryPrice,
                    },
                    priority: "high",
                },
                true
            );
        };

        const handleTakeProfit = (event: CustomEvent<PositionEvent>) => {
            const data = event.detail;
            const symbol = data.ticker || data.symbol || data.tokenSymbol || "Position";

            throttledLog(
                {
                    type: "position:take_profit",
                    data: {
                        tokenSymbol: symbol,
                        multiplier: data.target_multiplier,
                        realized: data.realized,
                    },
                    priority: "high",
                },
                true
            );
        };

        const handlePositionClosed = (event: CustomEvent<PositionEvent>) => {
            const data = event.detail;
            const symbol = data.ticker || data.symbol || data.tokenSymbol || "Position";

            if (data.reason === "stop_loss") {
                throttledLog(
                    {
                        type: "position:stop_loss",
                        data: {
                            tokenSymbol: symbol,
                            pnl: data.total_pnl_sol,
                        },
                        priority: "high",
                    },
                    true
                );
            } else {
                throttledLog(
                    {
                        type: "position:closed",
                        data: {
                            tokenSymbol: symbol,
                            pnl: data.total_pnl_sol,
                        },
                        priority: "normal",
                    },
                    true
                );
            }
        };

        // Listen for custom events dispatched from SmartTradingContext
        window.addEventListener("terminal:ai_reasoning", handleAiReasoning as EventListener);
        window.addEventListener("terminal:no_market_data", handleNoMarketData as EventListener);
        window.addEventListener("terminal:price_update", handlePriceUpdate as EventListener);
        window.addEventListener("terminal:position_opened", handlePositionOpened as EventListener);
        window.addEventListener("terminal:take_profit", handleTakeProfit as EventListener);
        window.addEventListener("terminal:position_closed", handlePositionClosed as EventListener);

        return () => {
            window.removeEventListener("terminal:ai_reasoning", handleAiReasoning as EventListener);
            window.removeEventListener("terminal:no_market_data", handleNoMarketData as EventListener);
            window.removeEventListener("terminal:price_update", handlePriceUpdate as EventListener);
            window.removeEventListener("terminal:position_opened", handlePositionOpened as EventListener);
            window.removeEventListener("terminal:take_profit", handleTakeProfit as EventListener);
            window.removeEventListener("terminal:position_closed", handlePositionClosed as EventListener);
        };
    }, [enabled, emitAiReasoning, emitNoMarketData, throttledLog]);
}

/**
 * Helper to dispatch terminal events from SmartTradingContext
 * Call this from the WebSocket event handlers
 */
export function dispatchTerminalEvent<T>(eventType: string, data: T): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent(`terminal:${eventType}`, { detail: data })
        );
    }
}
