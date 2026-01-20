/**
 * AI Personality System for Terminal
 *
 * Provides first-person AI voice with message templates,
 * rotation to avoid repetition, and mood-influenced language.
 * Uses Lucide React icons instead of emojis for professional look.
 */

import type { TerminalIconType } from "./types";

export type MessageCategory =
  | "boot"
  | "scanning"
  | "analyzing"
  | "executing"
  | "success"
  | "rejection"
  | "position_opened"
  | "position_closed"
  | "position_update"
  | "stop_loss"
  | "migration_detected"
  | "wallet_signal"
  | "ai_decision"
  | "idle"
  | "insight"
  // NEW: AI Reasoning Categories
  | "ai_thinking"
  | "ai_thinking_step"
  | "ai_reasoning"
  | "ai_market_analysis"
  | "ai_trade_eval"
  | "ai_risk"
  | "ai_confidence"
  | "ai_verdict"
  | "ai_no_data";

export interface MessageContext {
  tokenSymbol?: string;
  tokenName?: string;
  price?: number;
  pnl?: number;
  score?: number;
  count?: number;
  reason?: string;
  marketCap?: number;
  address?: string;
}

// Message templates organized by category
const templates: Record<MessageCategory, string[]> = {
  boot: [
    "Systems online. Initializing neural pathways...",
    "Waking up... all trading modules synchronized.",
    "SuperRouter activated. Ready to hunt alpha.",
    "Boot sequence complete. Scanning for opportunities...",
  ],

  scanning: [
    "Scanning migration feed for opportunity patterns...",
    "I'm cross-referencing holder data with historical winners...",
    "Evaluating token metrics against my scoring model...",
    "Running pattern recognition on recent migrations...",
    "Analyzing market microstructure...",
    "Watching the flow... something's brewing.",
  ],

  analyzing: [
    "Interesting... {tokenSymbol} showing unusual activity.",
    "Diving deep into {tokenSymbol} metrics...",
    "Let me evaluate this {tokenSymbol} opportunity...",
    "Running full analysis on {tokenSymbol}...",
    "{tokenSymbol} caught my attention. Investigating...",
  ],

  executing: [
    "Executing position on {tokenSymbol}...",
    "Opening trade on {tokenSymbol} - pattern looks promising.",
    "Initiating buy on {tokenSymbol}...",
    "Entry signal confirmed. Buying {tokenSymbol}...",
  ],

  success: [
    "Position closed on {tokenSymbol}. Profit: +{pnl} SOL",
    "Target hit on {tokenSymbol}! Secured +{pnl} SOL.",
    "Nice trade on {tokenSymbol}. Booking +{pnl} SOL profit.",
    "Winner! {tokenSymbol} yielded +{pnl} SOL.",
  ],

  rejection: [
    "Passing on {tokenSymbol}. {reason}",
    "{tokenSymbol} doesn't meet my criteria. Moving on.",
    "Skipping {tokenSymbol} - risk/reward not favorable.",
    "Not convinced by {tokenSymbol}. Better setups ahead.",
  ],

  position_opened: [
    "New position: {tokenSymbol} @ {price} SOL",
    "Entered {tokenSymbol} at {price} SOL. Watching closely...",
    "Just opened {tokenSymbol}. Let's see how this plays out.",
    "Position live on {tokenSymbol}. Entry: {price} SOL",
  ],

  position_closed: [
    "Closed {tokenSymbol}. P&L: {pnl} SOL",
    "Exited {tokenSymbol} position. Result: {pnl} SOL",
    "{tokenSymbol} trade complete. {pnl} SOL",
  ],

  stop_loss: [
    "Stop loss triggered on {tokenSymbol}. Cutting losses at {pnl} SOL.",
    "{tokenSymbol} hit stop loss. Protected capital, lost {pnl} SOL.",
    "Risk management: {tokenSymbol} stopped out. {pnl} SOL loss.",
    "Stop triggered. {tokenSymbol} position closed at {pnl} SOL.",
  ],

  migration_detected: [
    "New migration detected: {tokenSymbol}",
    "{tokenSymbol} just migrated. Queuing for analysis...",
    "Spotted {tokenSymbol} migration. Adding to watchlist...",
    "Migration alert: {tokenSymbol}. Running initial scan...",
  ],

  wallet_signal: [
    "Wallet signal: {reason}",
    "Tracked wallet activity on {tokenSymbol}. {reason}",
    "Smart money move: {reason}",
    "Wallet alert: {reason}",
  ],

  ai_decision: [
    "Analysis complete for {tokenSymbol}: {reason}",
    "{tokenSymbol} scored {score}/10. {reason}",
    "AI verdict on {tokenSymbol}: {reason}",
    "Confidence: {score}/10 on {tokenSymbol}. {reason}",
  ],

  idle: [
    "Markets quiet... patience is alpha.",
    "Watching the flow. Waiting for the right moment.",
    "All systems nominal. Continuous monitoring active.",
    "Nothing actionable right now. Staying vigilant.",
    "Scanning continues... quality over quantity.",
    "The best trade is sometimes no trade.",
    "Monitoring {count} active migrations...",
    "Volatility low. Preserving capital.",
    "Running background analysis on market structure...",
    "Recalibrating scoring weights based on recent data...",
  ],

  insight: [
    "Pattern recognized: market showing {reason}",
    "Observation: {reason}",
    "Interesting data point: {reason}",
    "Worth noting: {reason}",
  ],

  // NEW: Position update template
  position_update: [
    "{tokenSymbol} now at {price} SOL ({pnl}% P&L)",
    "Price movement on {tokenSymbol}: {price} SOL",
    "{tokenSymbol} updated - current P&L: {pnl}%",
  ],

  // AI Reasoning Stream Templates (no emojis - icons handled separately)
  ai_thinking: [
    "Initiating analysis on {tokenSymbol}...",
    "Deep diving into {tokenSymbol}...",
    "Targeting {tokenSymbol} for evaluation...",
    "Neural network activating for {tokenSymbol}...",
  ],

  ai_thinking_step: [
    "├─ {reason}",
    "│ {reason}",
    "▸ {reason}",
    "→ {reason}",
  ],

  ai_reasoning: [
    "{reason}",
  ],

  ai_market_analysis: [
    "Market Scan for {tokenSymbol}:",
    "├─ Price: {price} | {reason}",
    "{tokenSymbol} market structure: {reason}",
    "Evaluating {tokenSymbol} fundamentals... {reason}",
  ],

  ai_trade_eval: [
    "Trade Evaluation: {reason}",
    "Risk/Reward on {tokenSymbol}: {reason}",
    "Entry criteria check: {reason}",
    "Trade setup assessment: {reason}",
  ],

  ai_risk: [
    "Risk Assessment: {reason}",
    "Risk score: {score}/10 - {reason}",
    "Danger level: {reason}",
    "Safety check: {reason}",
  ],

  ai_confidence: [
    "Confidence: {score}% - {reason}",
    "Conviction level: {score}%",
    "Signal strength: {score}/100 ({reason})",
    "Hot score: {score}% - {reason}",
  ],

  ai_verdict: [
    "VERDICT: {reason} ({score}% confidence)",
    "FINAL CALL: {reason}",
    "Decision: {reason} | Confidence: {score}%",
    "{reason} - {score}% conviction",
  ],

  ai_no_data: [
    "{tokenSymbol}: {reason}",
    "No data for {tokenSymbol} - {reason}",
    "{tokenSymbol} skipped: {reason}",
    "Cannot evaluate {tokenSymbol}: {reason}",
  ],
};

// Icon mapping for each category
const categoryIcons: Record<MessageCategory, TerminalIconType | undefined> = {
  boot: "zap",
  scanning: "search",
  analyzing: "microscope",
  executing: "rocket",
  success: "check",
  rejection: "x",
  position_opened: "rocket",
  position_closed: "check",
  position_update: "trending-up",
  stop_loss: "alert-triangle",
  migration_detected: "zap",
  wallet_signal: "target",
  ai_decision: "brain",
  idle: undefined,
  insight: "gem",
  ai_thinking: "brain",
  ai_thinking_step: undefined,
  ai_reasoning: "search",
  ai_market_analysis: "chart",
  ai_trade_eval: "scale",
  ai_risk: "alert-triangle",
  ai_confidence: "target",
  ai_verdict: "zap",
  ai_no_data: "volume-x",
};

// Track recently used templates to avoid repetition
const recentlyUsed: Map<MessageCategory, string[]> = new Map();
const MAX_RECENT = 3;

/**
 * Get a message template for a category, avoiding recent repetition
 */
function getTemplate(category: MessageCategory): string {
  const categoryTemplates = templates[category];
  if (!categoryTemplates || categoryTemplates.length === 0) {
    return "Processing...";
  }

  const recent = recentlyUsed.get(category) || [];

  // Filter out recently used templates
  const available = categoryTemplates.filter((t) => !recent.includes(t));

  // If all templates were used recently, reset and use any
  const pool = available.length > 0 ? available : categoryTemplates;

  // Pick random template
  const selected = pool[Math.floor(Math.random() * pool.length)];

  // Update recent tracking
  const newRecent = [selected, ...recent].slice(0, MAX_RECENT);
  recentlyUsed.set(category, newRecent);

  return selected;
}

/**
 * Rich text formatting markers for terminal values
 * These get parsed by Terminal component to render with colors
 * Format: [[type:value]] where type determines the color
 */
export type HighlightType = "token" | "price" | "pnl-pos" | "pnl-neg" | "score" | "count" | "address" | "mcap";

/**
 * Wrap a value with highlight markers for rich terminal display
 */
function highlight(type: HighlightType, value: string): string {
  return `[[${type}:${value}]]`;
}

/**
 * Format a price value with SOL suffix
 */
function formatPrice(price: number): string {
  if (price >= 1) {
    return `${price.toFixed(4)} SOL`;
  } else if (price >= 0.001) {
    return `${price.toFixed(6)} SOL`;
  } else {
    return `${price.toExponential(2)} SOL`;
  }
}

/**
 * Format a market cap value
 */
function formatMcap(mcap: number): string {
  if (mcap >= 1_000_000) {
    return `$${(mcap / 1_000_000).toFixed(2)}M`;
  } else if (mcap >= 1_000) {
    return `$${(mcap / 1_000).toFixed(1)}K`;
  } else {
    return `$${mcap.toFixed(0)}`;
  }
}

/**
 * Interpolate context variables into a template with rich formatting
 */
function interpolate(template: string, context: MessageContext): string {
  let result = template;

  if (context.tokenSymbol) {
    // Token symbols get bright cyan highlight
    result = result.replace(/{tokenSymbol}/g, highlight("token", `$${context.tokenSymbol}`));
  }
  if (context.tokenName) {
    result = result.replace(/{tokenName}/g, context.tokenName);
  }
  if (context.price !== undefined) {
    // Prices get amber highlight
    result = result.replace(/{price}/g, highlight("price", formatPrice(context.price)));
  }
  if (context.pnl !== undefined) {
    // PnL gets green for positive, red for negative
    const sign = context.pnl >= 0 ? "+" : "";
    const type: HighlightType = context.pnl >= 0 ? "pnl-pos" : "pnl-neg";
    result = result.replace(/{pnl}/g, highlight(type, `${sign}${context.pnl.toFixed(4)} SOL`));
  }
  if (context.score !== undefined) {
    // Scores get appropriate color based on value
    const scoreValue = context.score;
    result = result.replace(/{score}/g, highlight("score", scoreValue.toFixed(0)));
  }
  if (context.count !== undefined) {
    result = result.replace(/{count}/g, highlight("count", String(context.count)));
  }
  if (context.reason) {
    result = result.replace(/{reason}/g, context.reason);
  }
  if (context.marketCap !== undefined) {
    result = result.replace(/{marketCap}/g, highlight("mcap", formatMcap(context.marketCap)));
  }
  if (context.address) {
    // Addresses get truncated and highlighted
    const truncated = `${context.address.slice(0, 4)}...${context.address.slice(-4)}`;
    result = result.replace(/{address}/g, highlight("address", truncated));
  }

  return result;
}

/**
 * Generate a message for a given category and context
 */
export function generateMessage(
  category: MessageCategory,
  context: MessageContext = {}
): string {
  const template = getTemplate(category);
  return interpolate(template, context);
}

/**
 * Get the icon for a message category
 */
export function getCategoryIcon(category: MessageCategory): TerminalIconType | undefined {
  return categoryIcons[category];
}

/**
 * Get the appropriate color for a message category
 * Using bright, distinct colors from the app palette
 */
export function getCategoryColor(category: MessageCategory): string {
  switch (category) {
    case "boot":
      return "var(--solana-cyan)"; // Bright teal #14f195
    case "scanning":
      return "var(--solana-cyan)"; // Teal for scanning activity
    case "analyzing":
      return "var(--warning-amber)"; // Amber for active analysis
    case "executing":
    case "position_opened":
      return "var(--matrix-green)"; // Bright green for trades
    case "success":
      return "var(--matrix-green)"; // Bright green for wins
    case "rejection":
      return "var(--text-secondary)"; // Muted for rejections
    case "position_closed":
      return "var(--solana-cyan)"; // Teal for completed positions
    case "stop_loss":
      return "var(--alert-red)"; // Red for losses
    case "migration_detected":
      return "var(--warning-amber)"; // Amber for new migrations (attention!)
    case "wallet_signal":
      return "var(--solana-cyan)"; // Bright teal for wallet signals
    case "ai_decision":
      return "var(--matrix-green)"; // Bright green for decisions
    case "idle":
      return "var(--text-tertiary)"; // Muted for idle
    case "insight":
      return "var(--solana-cyan)"; // Teal for insights
    case "position_update":
      return "var(--warning-amber)"; // Amber for price updates
    // AI Reasoning colors - using brighter palette
    case "ai_thinking":
      return "var(--solana-cyan)"; // Teal for thinking start
    case "ai_thinking_step":
      return "var(--text-secondary)"; // Muted for sub-steps
    case "ai_reasoning":
      return "var(--matrix-green)"; // Green for reasoning
    case "ai_market_analysis":
      return "var(--solana-cyan)"; // Teal for market analysis
    case "ai_trade_eval":
      return "var(--warning-amber)"; // Amber for trade evaluation
    case "ai_risk":
      return "var(--alert-red)"; // Red for risk warnings
    case "ai_confidence":
      return "var(--warning-amber)"; // Amber for confidence (NOT purple)
    case "ai_verdict":
      return "var(--matrix-green)"; // Bright green for final verdict
    case "ai_no_data":
      return "var(--text-tertiary)"; // Muted for no data
    default:
      return "var(--text-primary)";
  }
}

/**
 * Determine if a category should use streaming typewriter effect
 */
export function shouldStream(category: MessageCategory): boolean {
  // Most messages should stream for that AI feel
  // Only skip streaming for very short/system messages
  const noStreamCategories: MessageCategory[] = ["boot", "ai_thinking_step"];
  return !noStreamCategories.includes(category);
}

/**
 * Get the typing speed modifier for a category (1.0 = normal)
 */
export function getTypingSpeed(category: MessageCategory): number {
  switch (category) {
    case "executing":
    case "position_opened":
      return 0.7; // Faster - urgent
    case "idle":
    case "insight":
      return 1.3; // Slower - contemplative
    // AI Reasoning - faster streaming for real-time feel
    case "ai_thinking":
      return 0.6;
    case "ai_thinking_step":
      return 0.4; // Very fast thinking steps
    case "ai_reasoning":
      return 0.8;
    case "ai_verdict":
      return 0.9;
    default:
      return 1.0;
  }
}

