/**
 * Terminal Event System
 *
 * A pluggable event system for the AI Terminal.
 * Add new event types here and they'll automatically be available.
 */

import type { MessageCategory, MessageContext } from "./ai-personality";

// ============================================
// Event Types - Add new events here
// ============================================

export type TerminalEventType =
  // System events
  | "system:boot"
  | "system:idle"
  | "system:scanning"
  // Position events
  | "position:opened"
  | "position:closed"
  | "position:profit"
  | "position:stop_loss"
  | "position:price_update"
  | "position:take_profit"
  // Migration events
  | "migration:detected"
  | "migration:analyzing"
  | "migration:scored"
  // Wallet signal events
  | "wallet:signal_detected"
  | "wallet:whale_buy"
  | "wallet:whale_sell"
  // AI events
  | "ai:analyzing"
  | "ai:decision"
  | "ai:insight"
  // NEW: AI Reasoning Stream Events
  | "ai:thinking_start"
  | "ai:thinking_step"
  | "ai:reasoning_stream"
  | "ai:market_analysis"
  | "ai:trade_evaluation"
  | "ai:risk_assessment"
  | "ai:confidence_score"
  | "ai:final_verdict"
  | "ai:no_market_data";

// ============================================
// Event Payload Types
// ============================================

export interface TerminalEvent {
  type: TerminalEventType;
  data?: Record<string, unknown>;
  priority?: "high" | "normal" | "low";
}

// ============================================
// Event to Message Mapping
// ============================================

interface EventMapping {
  category: MessageCategory;
  contextMapper?: (data?: Record<string, unknown>) => MessageContext;
}

const eventMappings: Record<TerminalEventType, EventMapping> = {
  // System events
  "system:boot": { category: "boot" },
  "system:idle": {
    category: "idle",
    contextMapper: (data) => ({
      count: data?.count as number | undefined,
      reason: data?.reason as string | undefined,
    }),
  },
  "system:scanning": { category: "scanning" },

  // Position events
  "position:opened": {
    category: "position_opened",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      price: data?.price as number | undefined,
      address: data?.address as string | undefined,
      marketCap: data?.marketCap as number | undefined,
    }),
  },
  "position:closed": {
    category: "position_closed",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.pnl as number | undefined,
      address: data?.address as string | undefined,
    }),
  },
  "position:profit": {
    category: "success",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.pnl as number | undefined,
      address: data?.address as string | undefined,
    }),
  },
  "position:stop_loss": {
    category: "stop_loss",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.pnl as number | undefined,
      address: data?.address as string | undefined,
    }),
  },

  // Migration events
  "migration:detected": {
    category: "migration_detected",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      address: data?.address as string | undefined,
      marketCap: data?.marketCap as number | undefined,
    }),
  },
  "migration:analyzing": {
    category: "analyzing",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
    }),
  },
  "migration:scored": {
    category: "insight",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      score: data?.score as number | undefined,
      reason: data?.decision as string | undefined,
    }),
  },

  // Wallet signal events
  "wallet:signal_detected": {
    category: "wallet_signal",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: `${data?.walletLabel || "Tracked wallet"} ${data?.action === "BUY" ? "bought" : "sold"}`,
    }),
  },
  "wallet:whale_buy": {
    category: "wallet_signal",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: `Whale activity: ${data?.walletLabel || "Big player"} buying`,
    }),
  },
  "wallet:whale_sell": {
    category: "wallet_signal",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: `Warning: ${data?.walletLabel || "Whale"} selling`,
    }),
  },

  // AI events
  "ai:analyzing": {
    category: "analyzing",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
    }),
  },
  "ai:decision": {
    category: "ai_decision",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      score: data?.confidence as number | undefined,
      reason: `${data?.decision}`,
    }),
  },
  "ai:insight": {
    category: "insight",
    contextMapper: (data) => ({
      reason: data?.message as string | undefined,
    }),
  },

  // NEW: AI Reasoning Stream Events
  "ai:thinking_start": {
    category: "ai_thinking",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: "Initiating deep analysis...",
    }),
  },
  "ai:thinking_step": {
    category: "ai_thinking_step",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: data?.step as string | undefined,
    }),
  },
  "ai:reasoning_stream": {
    category: "ai_reasoning",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: data?.reasoning as string | undefined,
    }),
  },
  "ai:market_analysis": {
    category: "ai_market_analysis",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      price: data?.price as number | undefined,
      reason: data?.analysis as string | undefined,
    }),
  },
  "ai:trade_evaluation": {
    category: "ai_trade_eval",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: data?.evaluation as string | undefined,
    }),
  },
  "ai:risk_assessment": {
    category: "ai_risk",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      score: data?.riskScore as number | undefined,
      reason: data?.assessment as string | undefined,
    }),
  },
  "ai:confidence_score": {
    category: "ai_confidence",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      score: data?.confidence as number | undefined,
      reason: data?.factors as string | undefined,
    }),
  },
  "ai:final_verdict": {
    category: "ai_verdict",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      score: data?.confidence as number | undefined,
      reason: data?.verdict as string | undefined,
    }),
  },
  "ai:no_market_data": {
    category: "ai_no_data",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      reason: data?.reason as string | undefined,
    }),
  },

  // Position events (extended)
  "position:price_update": {
    category: "position_update",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      price: data?.price as number | undefined,
      pnl: data?.pnl as number | undefined,
    }),
  },
  "position:take_profit": {
    category: "success",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.realized as number | undefined,
      reason: `${data?.multiplier}x target hit!`,
    }),
  },
};

// ============================================
// Event Resolver
// ============================================

export function resolveEvent(event: TerminalEvent): {
  category: MessageCategory;
  context: MessageContext;
} {
  const mapping = eventMappings[event.type];

  if (!mapping) {
    console.warn(`Unknown terminal event type: ${event.type}`);
    return { category: "idle", context: {} };
  }

  const context = mapping.contextMapper ? mapping.contextMapper(event.data) : {};

  return {
    category: mapping.category,
    context,
  };
}

// ============================================
// Event Priority
// ============================================

export function getEventPriority(event: TerminalEvent): number {
  if (event.priority === "high") return 3;
  if (event.priority === "low") return 1;

  // Default priorities by event type
  const highPriorityTypes: TerminalEventType[] = [
    "position:opened",
    "position:profit",
    "position:stop_loss",
    "wallet:whale_buy",
    "wallet:whale_sell",
    "ai:decision",
  ];

  const lowPriorityTypes: TerminalEventType[] = [
    "system:idle",
    "system:scanning",
  ];

  if (highPriorityTypes.includes(event.type)) return 3;
  if (lowPriorityTypes.includes(event.type)) return 1;

  return 2; // Normal priority
}
