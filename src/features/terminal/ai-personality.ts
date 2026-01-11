/**
 * AI Personality System for Terminal
 *
 * Provides first-person AI voice with message templates,
 * rotation to avoid repetition, and mood-influenced language.
 */

export type MessageCategory =
  | "boot"
  | "scanning"
  | "analyzing"
  | "executing"
  | "success"
  | "rejection"
  | "position_opened"
  | "position_closed"
  | "stop_loss"
  | "migration_detected"
  | "wallet_signal"
  | "ai_decision"
  | "idle"
  | "insight";

export interface MessageContext {
  tokenSymbol?: string;
  tokenName?: string;
  price?: number;
  pnl?: number;
  score?: number;
  count?: number;
  reason?: string;
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
 * Interpolate context variables into a template
 */
function interpolate(template: string, context: MessageContext): string {
  let result = template;

  if (context.tokenSymbol) {
    result = result.replace(/{tokenSymbol}/g, `$${context.tokenSymbol}`);
  }
  if (context.tokenName) {
    result = result.replace(/{tokenName}/g, context.tokenName);
  }
  if (context.price !== undefined) {
    result = result.replace(/{price}/g, context.price.toFixed(6));
  }
  if (context.pnl !== undefined) {
    const sign = context.pnl >= 0 ? "+" : "";
    result = result.replace(/{pnl}/g, `${sign}${context.pnl.toFixed(4)}`);
  }
  if (context.score !== undefined) {
    result = result.replace(/{score}/g, context.score.toFixed(1));
  }
  if (context.count !== undefined) {
    result = result.replace(/{count}/g, String(context.count));
  }
  if (context.reason) {
    result = result.replace(/{reason}/g, context.reason);
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
 * Get the appropriate color for a message category
 */
export function getCategoryColor(category: MessageCategory): string {
  switch (category) {
    case "boot":
      return "var(--solana-cyan)";
    case "scanning":
    case "analyzing":
      return "var(--matrix-green)";
    case "executing":
    case "position_opened":
      return "var(--warning-amber)";
    case "success":
      return "var(--matrix-green)";
    case "rejection":
    case "position_closed":
      return "var(--text-secondary)";
    case "stop_loss":
      return "var(--alert-red)";
    case "migration_detected":
      return "var(--solana-purple)";
    case "wallet_signal":
      return "var(--solana-cyan)";
    case "ai_decision":
      return "var(--matrix-green)";
    case "idle":
      return "var(--text-tertiary)";
    case "insight":
      return "var(--solana-cyan)";
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
  return category !== "boot";
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
    default:
      return 1.0;
  }
}
