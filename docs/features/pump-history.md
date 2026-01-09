# Feature: Pump History + AI Retracement Trading

## Purpose
Track migrated tokens, monitor price journeys, and surface AI-powered retracement trading signals. The system identifies tokens that have proven they can pump, then signals entries when they pull back to attractive levels.

## Core Strategy: Retracement Trading

**Philosophy:** A token that migrated at $5K MCap, pumped to $600K, and dropped to $100K is a BUY signal - NOT a sell signal. The pump proves the token can run; the dip provides the discount.

### Entry Criteria (Algorithmic)
1. **Pump Multiple**: Token must have pumped at least 10x from migration MCap
2. **Drawdown Zone**: Current price is 40-70% below ATH (sweet spot)
3. **Trend**: Not actively dumping (consolidating or recovering preferred)
4. **Token Age**: Less than 1 hour old (fresh migrations only)
5. **Liquidity**: Sufficient liquidity remains (> $5K)

### Signal Levels
| Signal | Score | Criteria |
|--------|-------|----------|
| STRONG_BUY | 80+ | 20x+ pump, 50-60% drawdown, trend recovering |
| BUY | 65-79 | 10x+ pump, 40-70% drawdown, stable trend |
| WATCH | 45-64 | Pump proof but outside ideal drawdown zone |
| AVOID | <45 | Insufficient pump proof or >70% drawdown |

### Example Trade
```
Token: $PEPE
Migration MCap: $5,000
All-Time High: $120,000 (24x pump - PROVEN)
Current MCap: $60,000 (50% drawdown)
Signal: STRONG_BUY
Entry: ~$60K MCap
Target: Previous ATH ($120K) = 2x from entry
Risk: If dumps to $30K = -50%
R:R: 2:1
```

## Architecture

### Data Flow
```
DexScreener API → Token Tracking Service → In-Memory Cache → API Route → React Hook → UI
     ↑                    ↑                      ↑                          ↓
   (polling)         (snapshots)            (journeys)              Entry Signals
```

### Components

#### 1. Token Tracking Service (`/src/lib/tokenTrackingService.ts`)
- **Purpose**: Central cache polling DexScreener every 30 seconds
- **Data Stored**: Price snapshots, ATH tracking, journey metadata
- **Exports**:
  - `updateTokenTracking(tokens)` - Update cache with new token data
  - `getAllTokenJourneys()` - Get all tracked journeys
  - `getTokenJourney(mint)` - Get specific token journey
  - `getCacheStats()` - Cache statistics

```typescript
// Configuration
const MAX_SNAPSHOTS = 60;         // Keep last 60 snapshots (~30 min)
const MAX_TOKEN_AGE_MS = 3600000; // Track tokens < 1 hour old
const POLL_INTERVAL_MS = 30000;   // Poll every 30 seconds
```

#### 2. Token Journey Analysis (`/src/lib/tokenJourney.ts`)
- **Purpose**: Pure algorithmic analysis of token price journeys
- **Calculates**:
  - Pump multiple: `ATH / MigrationMcap`
  - Drawdown: `(ATH - Current) / ATH * 100`
  - Trend: pumping, dumping, consolidating
  - Entry signal with score and reasons

```typescript
interface TokenJourney {
  mint: string;
  symbol: string;
  migrationMcap: number;
  athMcap: number;
  currentMcap: number;
  currentLiquidity: number;
  snapshots: PriceSnapshot[];
  signals: RetracementSignals;
  detectedAt: Date;
  athTimestamp: Date;
  lastUpdated: Date;
}

interface EntryAnalysis {
  signal: 'strong_buy' | 'buy' | 'watch' | 'avoid' | 'no_data';
  score: number;
  reasons: string[];
  warnings: string[];
}
```

#### 3. API Route (`/src/app/api/token-tracking/route.ts`)
- **GET**: Retrieve journeys with optional filters
  - `?mint=xxx` - Get specific token
  - `?signal=strong_buy` - Filter by signal
  - `?stats=true` - Cache statistics only
- **POST**: Update cache and return analyzed journeys

#### 4. React Hook (`/src/features/pump-history/hooks/useRetracementAnalysis.ts`)
- **Purpose**: Frontend polling and state management
- **Polling**: Every 30 seconds
- **Returns**: `analysisResults`, `strongBuys`, `buys`, `watches`, `refresh()`

## AI Integration

### AI-Powered Entry Analysis
When a token scores BUY or STRONG_BUY, AI generates:
1. **Entry Reasoning**: Natural language explanation of why this is a good entry
2. **Risk Assessment**: Potential risks and warning signs
3. **Strategy Suggestion**: Recommended entry/exit approach

### AI Architecture

#### 5. AI Entry Analysis Service (`/src/lib/aiEntryAnalysis.ts`)
- **Purpose**: Generate natural language entry analysis using Gemini AI
- **Model**: `gemini-1.5-flash`
- **Triggers**: Only for BUY and STRONG_BUY signals
- **Fallback**: Returns algorithmic fallback when AI fails
- **Exports**:
  - `generateAiEntryAnalysis(input)` - Single token analysis
  - `batchAnalyze(inputs)` - Batch analysis with rate limiting

#### 6. AI Entry API Route (`/src/app/api/ai-entry-analysis/route.ts`)
- **POST**: Generate AI analysis
  - Single: `{ journey: TokenJourney, analysis: EntryAnalysis }`
  - Batch: `{ batch: true, tokens: [...] }` (max 10)
- **Returns**: `{ success: true, data: AiEntryAnalysis }`
- **Environment**: Requires `GEMINI_API_KEY`

#### 7. AI Entry Hook (`/src/features/pump-history/hooks/useAiEntryAnalysis.ts`)
- **Purpose**: Frontend integration for AI analysis
- **Auto-queues**: BUY/STRONG_BUY signals for analysis
- **Rate limiting**: 1 second between requests
- **Returns**: `aiResults`, `currentlyAnalyzing`, `isAnalyzing`

### AI Prompt Template
```
Analyze this meme coin for retracement entry opportunity:

Token: {symbol}
Migration MCap: ${migrationMcap}
All-Time High: ${athMcap} ({pumpMultiple}x pump)
Current MCap: ${currentMcap}
Drawdown from ATH: {drawdownPercent}%
Current Liquidity: ${liquidity}
Trend: {trend}
Token Age: {ageMinutes} minutes

Entry Score: {score}/100 - {signal}

Provide:
1. ONE SENTENCE explaining why this is/isn't a good entry
2. Key risk to watch
3. Suggested exit strategy (if BUY signal)
```

### AI Response Format
```typescript
interface AiEntryAnalysis {
  reasoning: string;    // e.g., "24x proven pump with 50% discount offers 2:1 R:R"
  risk: string;         // e.g., "Low liquidity may cause slippage on exit"
  strategy?: string;    // e.g., "Scale in 50% now, 50% at 60% drawdown"
  _raw?: string;        // Raw AI response for debugging
}
```

### AI Flow
```
Token → useRetracementAnalysis (algorithmic) → BUY/STRONG_BUY signal
                                                       ↓
                        useAiEntryAnalysis queues for AI analysis
                                                       ↓
                        POST /api/ai-entry-analysis (Gemini API)
                                                       ↓
                        TokenCard displays reasoning, risk, strategy
```

## UI Components

### Token Card Display
- **Badge**: STRONG BUY (green glow) / BUY (green) / WATCH (amber) / AVOID (red)
- **Stats Row**: Pump (Xx) | Dip (%) | ATH ($) | Trend | MCap | Liquidity
- **AI Reasoning**: Expandable section with AI analysis (for BUY signals)

### Stats Summary
- Count by signal type (STRONG_BUY, BUY, WATCH, AVOID)
- Tracking status (polling indicator)
- Last updated timestamp

## Data Sources
- **PumpPortal**: Token detection, migration data, initial MCap
- **DexScreener**: Real-time price, MCap, liquidity (via `/tokens/v1/solana/{addresses}`)
- **WebSocket**: New token notifications

## Changelog
- 2026-01-09: Added AI-powered entry reasoning system
- 2026-01-09: Implemented retracement trading strategy with ATH tracking
- 2026-01-09: Added token journey service with in-memory cache
- 2026-01-08: Added initial Pump History section with stats, filters, and token table

## Technical Notes

### Why In-Memory Cache?
- DexScreener doesn't provide historical data or ATH
- We must track price journey ourselves
- Single backend cache prevents redundant API calls
- All frontend clients read from shared cache

### ATH Tracking Logic
```typescript
// Update ATH if current MCap exceeds previous ATH
if (currentMcap > journey.athMcap) {
  journey.athMcap = currentMcap;
  journey.athTimestamp = new Date();
}
```

### Drawdown Calculation
```typescript
const drawdownPercent = ((athMcap - currentMcap) / athMcap) * 100;
```

### Pump Multiple
```typescript
const pumpMultiple = athMcap / migrationMcap;
```
