# Backend Spec: Wallet Signal Position Sizing & Re-Reasoning

**Date:** 2026-01-18
**Status:** Ready for Implementation
**Frontend PR:** `768d369` (already merged)

---

## Summary

Two features need backend implementation:

1. **Position Size Multiplier** - Wallet signals should use 0.5x position size (2x less than migrations)
2. **Re-Reasoning Trigger** - When tracked wallet buys a token we PASSed, trigger new AI analysis

---

## Problem Statement

From colleague discussion:

> "Ние следим няколко сигнала, като това, което ние си взимаме от Dex и тем подобни си слагаме в трейда, колкото сме му казали. Но нали следим и wallet-ti, които правят трейдс. **Тея като отворят позиция слагаме 2 пъти по-малко**"

Translation: When we trade based on wallet signals (vs migrations/DEX), we should use **2x less** position size.

> "to ideqta e kato sledim nqkuv token... vleze nqkuv wallet... **da napravi nov reasoning i da vidi otnovo dali da vliza ili ne**"

Translation: When a tracked wallet enters a token we're watching, it should do **new reasoning** to reconsider entry.

---

## Feature 1: Position Size by Signal Source

### Current Behavior
- All positions use the same `buy_amount_sol` regardless of signal source

### Desired Behavior
- Migration signals → Full position size (`buy_amount_sol`)
- Tracked wallet signals → Half position size (`buy_amount_sol * 0.5`)

### Implementation

#### 1. Add Config Fields

**File:** Trading config schema/model

```typescript
interface TradingConfig {
  // ... existing fields ...

  // NEW: Wallet signal settings
  wallet_signal_size_multiplier: number;  // Default: 0.5 (2x less)
  re_analyze_on_wallet_signal: boolean;   // Default: true
}
```

**Migration/Default:**
```sql
ALTER TABLE trading_config
ADD COLUMN wallet_signal_size_multiplier FLOAT DEFAULT 0.5,
ADD COLUMN re_analyze_on_wallet_signal BOOLEAN DEFAULT true;
```

#### 2. Add Signal Source Enum

```typescript
enum SignalSource {
  MIGRATION = "migration",
  TRACKED_WALLET = "tracked_wallet",
  DEX_ACTIVITY = "dex",
  PRICE_MOMENTUM = "price_momentum",
  MANUAL = "manual",
}
```

#### 3. Track Signal Source on Positions

**File:** Position/Holding model

```typescript
interface Position {
  // ... existing fields ...

  // NEW
  signal_source: SignalSource;
  triggered_by_wallet?: string;  // Wallet address if signal_source is TRACKED_WALLET
}
```

#### 4. Apply Multiplier on Position Entry

**File:** Position entry service (where buy orders are created)

```typescript
function calculatePositionSize(
  config: TradingConfig,
  signalSource: SignalSource
): number {
  const baseSize = config.buy_amount_sol;

  if (signalSource === SignalSource.TRACKED_WALLET) {
    return baseSize * (config.wallet_signal_size_multiplier ?? 0.5);
  }

  return baseSize;
}

// Usage in position creation:
async function openPosition(signal: Signal) {
  const size = calculatePositionSize(config, signal.source);

  await executeBuy({
    mint: signal.mint,
    amount_sol: size,  // 0.05 SOL instead of 0.1 SOL for wallet signals
    signal_source: signal.source,
    triggered_by_wallet: signal.wallet_address,
  });
}
```

#### 5. Return Signal Source in API Response

**Endpoint:** `GET /api/trading/holdings`

```json
{
  "data": [
    {
      "id": "pos_123",
      "mint": "ABC...",
      "symbol": "TOKEN",
      "entry_sol_value": 0.05,
      "signal_source": "tracked_wallet",
      "triggered_by_wallet": "WalletAddress123..."
    }
  ]
}
```

---

## Feature 2: Re-Reasoning on Wallet Signal

### Current Behavior
- AI analyzes token once when detected
- If decision is PASS, no further analysis happens
- Tracked wallet buying doesn't trigger re-analysis

### Desired Behavior
- When tracked wallet buys a token we previously PASSed on → trigger new AI analysis
- Include wallet signal as additional context in the analysis
- May flip PASS → ENTER based on wallet confidence

### Implementation

#### 1. Detect Re-Analysis Trigger

**File:** Wallet signal handler

```typescript
async function handleWalletSignal(signal: WalletSignal) {
  // Find existing migration/token
  const migration = await getMigration(signal.mint);

  if (!migration) {
    // New token from wallet - create migration and analyze
    await createMigrationFromWalletSignal(signal);
    return;
  }

  // Check if we should re-analyze
  const shouldReAnalyze =
    migration.last_ai_decision === "PASS" &&
    signal.action === "BUY" &&
    config.re_analyze_on_wallet_signal;

  if (shouldReAnalyze) {
    console.log(`🔄 Re-analyzing ${migration.symbol} - wallet ${signal.wallet_label} bought after PASS`);

    // Queue new analysis with wallet context
    await queueAiAnalysis(signal.mint, {
      trigger: "WALLET_SIGNAL",
      wallet_address: signal.wallet_address,
      wallet_label: signal.wallet_label,
      wallet_buy_amount: signal.amount_sol,
      previous_decision: "PASS",
    });
  }

  // Update migration with wallet signal (existing logic)
  await updateMigrationWalletSignals(migration.id, signal);
}
```

#### 2. Include Wallet Context in AI Prompt

**File:** AI analysis service

```typescript
async function analyzeToken(mint: string, context?: AnalysisContext) {
  const marketData = await getMarketData(mint);

  let prompt = buildBasePrompt(marketData);

  // Add wallet signal context if triggered by wallet
  if (context?.trigger === "WALLET_SIGNAL") {
    prompt += `

IMPORTANT CONTEXT:
A tracked wallet "${context.wallet_label}" just bought this token for ${context.wallet_buy_amount} SOL.
Previous AI decision was: ${context.previous_decision}

Consider this wallet signal as a strong indicator. Re-evaluate whether to enter.
    `;
  }

  const analysis = await gemini.analyze(prompt);

  // Log the re-analysis
  await logAiAnalysis({
    mint,
    trigger_type: context?.trigger || "SCHEDULED",
    decision: analysis.decision,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    wallet_trigger: context?.wallet_address,
  });

  return analysis;
}
```

#### 3. Emit WebSocket Event

**File:** WebSocket emitter

```typescript
// After re-analysis completes, emit to frontend
wsServer.emit("ai_reasoning", {
  type: "ai_reasoning",
  symbol: migration.symbol,
  mint: migration.mint,
  reasoning: analysis.reasoning,
  conviction: analysis.confidence,
  will_trade: analysis.decision === "ENTER",
  trigger: "WALLET_REANALYSIS",
  triggered_by: walletLabel,
  timestamp: Date.now(),
});
```

---

## API Changes Summary

### Config Endpoint

**`GET/PATCH /api/trading/config`**

```typescript
// Response includes new fields:
{
  "buy_amount_sol": 0.1,
  "wallet_signal_size_multiplier": 0.5,  // NEW
  "re_analyze_on_wallet_signal": true,   // NEW
  // ... other fields
}
```

### Holdings Endpoint

**`GET /api/trading/holdings`**

```typescript
// Each holding includes:
{
  "id": "...",
  "mint": "...",
  "entry_sol_value": 0.05,         // Will be 0.5x for wallet signals
  "signal_source": "tracked_wallet", // NEW
  "triggered_by_wallet": "...",      // NEW (optional)
  // ... other fields
}
```

### WebSocket Events

**New event type for re-analysis:**

```typescript
{
  type: "ai_reasoning",
  trigger: "WALLET_REANALYSIS",  // NEW - distinguishes from regular analysis
  triggered_by: "otta",          // NEW - wallet label
  symbol: "TOKEN",
  mint: "...",
  reasoning: "...",
  conviction: 0.85,
  will_trade: true,
  timestamp: 1737200000000
}
```

---

## Database Changes

```sql
-- Add config fields
ALTER TABLE trading_config
ADD COLUMN wallet_signal_size_multiplier FLOAT DEFAULT 0.5,
ADD COLUMN re_analyze_on_wallet_signal BOOLEAN DEFAULT true;

-- Add signal source to positions
ALTER TABLE positions
ADD COLUMN signal_source VARCHAR(50) DEFAULT 'migration',
ADD COLUMN triggered_by_wallet VARCHAR(100);

-- Add trigger type to AI analysis log (if not exists)
ALTER TABLE token_ai_analysis_log
ADD COLUMN wallet_trigger VARCHAR(100);
```

---

## Testing Checklist

### Position Sizing
- [ ] Migration signal creates position with full `buy_amount_sol`
- [ ] Wallet signal creates position with `buy_amount_sol * 0.5`
- [ ] Config `wallet_signal_size_multiplier` is respected
- [ ] `signal_source` is correctly set on new positions
- [ ] Holdings API returns `signal_source` field

### Re-Reasoning
- [ ] Wallet BUY on token with PASS decision triggers re-analysis
- [ ] Re-analysis includes wallet context in prompt
- [ ] WebSocket emits `ai_reasoning` with `trigger: "WALLET_REANALYSIS"`
- [ ] Config `re_analyze_on_wallet_signal: false` disables re-analysis
- [ ] Re-analysis can flip PASS → ENTER and open position

### Edge Cases
- [ ] Wallet SELL does not trigger re-analysis
- [ ] Multiple wallet signals don't spam re-analysis (debounce?)
- [ ] Token without prior analysis gets normal analysis (not re-analysis)

---

## Frontend (Already Done)

The frontend in `opus-x` already:
- ✅ Has `SignalSource` enum
- ✅ Triggers re-analysis call when wallet signal on PASS token
- ✅ Has `calculatePositionSize()` helper ready
- ✅ Tracks `signalSource` and `hasWalletConfirmation` on migrations
- ✅ Dispatches `wallet_reanalysis_trigger` terminal event

Once backend is ready, it will just work.

---

## Questions for Backend

1. **Debouncing** - Should we debounce re-analysis if multiple wallets buy quickly?
2. **Cooldown** - Should there be a cooldown period after re-analysis before another?
3. **Max re-analyses** - Limit how many times a token can be re-analyzed?
4. **Amount bug** - "там не беше сложило правилната сума" - is there a known issue with amount calculation?

---

## Timeline Estimate

| Task | Effort |
|------|--------|
| Config fields + migration | ~30 min |
| Signal source on positions | ~1 hour |
| Position size calculation | ~30 min |
| Re-analysis trigger logic | ~2 hours |
| AI prompt modification | ~1 hour |
| Testing | ~2 hours |
| **Total** | **~7 hours** |
