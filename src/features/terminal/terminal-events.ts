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
  | "ai:insight";

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
    }),
  },
  "position:closed": {
    category: "position_closed",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.pnl as number | undefined,
    }),
  },
  "position:profit": {
    category: "success",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.pnl as number | undefined,
    }),
  },
  "position:stop_loss": {
    category: "stop_loss",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
      pnl: data?.pnl as number | undefined,
    }),
  },

  // Migration events
  "migration:detected": {
    category: "migration_detected",
    contextMapper: (data) => ({
      tokenSymbol: data?.tokenSymbol as string | undefined,
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
