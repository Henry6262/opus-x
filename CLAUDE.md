# Opus-X - AI Trading Dashboard

> AI-powered Solana token trading dashboard with real-time analysis,
> multi-wallet tracking, and automated position management.

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Real-time**: WebSocket (socket.io-client)
- **Charts**: Recharts
- **Animations**: GSAP + Motion (Framer Motion)
- **i18n**: next-intl (EN/ZH)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Railway

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/           # Localized routes
│   │   ├── cockpit/        # Main trading dashboard
│   │   ├── analytics-debug/# Debug analytics page
│   │   └── page.tsx        # Homepage
│   └── api/                # API routes
│       ├── ai-entry-analysis/  # Gemini AI token analysis
│       ├── character/          # Character/persona endpoint
│       ├── simulation/         # Trading simulation
│       ├── token-tracking/     # Token tracking service
│       └── twitter/            # Twitter integration
├── features/               # Feature modules
│   ├── smart-trading/      # Trading dashboard & positions
│   ├── terminal/           # AI narrator terminal
│   ├── portfolio-wallet/   # Holdings & P&L
│   ├── pump-history/       # Token tracking
│   └── simulation-twitter/ # Twitter integration
├── components/             # UI components
│   ├── ui/                 # shadcn/ui primitives
│   ├── design-system/      # Layout patterns
│   ├── analytics/          # Analytics components
│   ├── animations/         # Animation components
│   ├── trading/            # Trading UI components
│   └── target-cursor/      # Custom cursor effects
├── lib/                    # Utilities & API clients
│   ├── devprint-api.ts     # Main DevPrint client (auto snake_case conversion)
│   ├── trading-api.ts      # Birdeye/Analytics API client
│   ├── aiEntryAnalysis.ts  # Gemini AI analysis
│   ├── useWebSocket.ts     # WebSocket hook (shared singleton)
│   ├── priceTracking.ts    # Price monitoring service
│   ├── tokenJourney.ts     # Token lifecycle tracking
│   ├── tokenTrackingService.ts # In-memory token tracking cache
│   ├── versioning-api.ts   # Agent version management
│   ├── config.ts           # API URL configuration
│   ├── api-client.ts       # Base API utilities
│   └── server/             # Server-side helpers
│       └── ponzinomics.ts  # Ponzinomics auth helpers
├── hooks/                  # Custom React hooks
│   ├── useAiMood.ts        # AI mood state
│   ├── useTradingAnalytics.ts  # Trading analytics
│   ├── useVersionComparison.ts # Version diff
│   ├── useVersions.ts      # Version history
│   └── useVibrCoderState.ts    # Vibr coder state
├── i18n/                   # Internationalization
│   └── messages/           # en.json, zh.json
└── types/                  # TypeScript definitions
    ├── trading.ts          # Trading types
    └── versioning.ts       # Version types
```

## Key Features

### 1. Smart Trading Dashboard (`src/features/smart-trading/`)
- Real-time position management with WebSocket updates
- Migration feed with AI confidence scoring & ranking
- Wallet signal detection with re-analysis triggers
- Target/stop-loss management (TP1, TP2, TP3 with partial close)
- Performance analytics with version comparison
- Activity feed (50-item event history)
- Buy criteria evaluation (11+ criteria: confidence, market cap, liquidity, holders, momentum, etc.)

### 2. AI Terminal (`src/features/terminal/`)
- Matrix-themed AI reasoning display
- Real-time streaming from backend
- Boot sequence animation
- Personality-based responses (`ai-personality.ts`)
- Event-driven updates via terminal dispatcher

### 3. Portfolio Wallet (`src/features/portfolio-wallet/`)
- Holdings snapshot (real-time updates every 2s)
- Entry SOL value tracking per position
- P&L calculations (unrealized + realized)
- Peak price tracking

### 4. Pump History (`src/features/pump-history/`)
- Token tracking & journey analysis
- AI entry analysis via Gemini
- Retracement analysis
- Signal generation (strong_buy, buy, watch, avoid)
- Price tracking with market data

### 5. Simulation Twitter (`src/features/simulation-twitter/`)
- Twitter account tracking
- Quote generation
- Wallet Twitter profile sync

## Backend Integrations

| Service | URL | Purpose |
|---------|-----|---------|
| DevPrint | `devprint-v2-production.up.railway.app` | Main backend (positions, config, versions, watchlist) |
| Ponzinomics | `ponzinomics-production.up.railway.app` | Wallet signals, Twitter data |
| Birdeye | Via Ponzinomics | On-chain P&L (single source of truth) |
| Gemini | Google API | AI entry analysis |
| Supabase | Project DB | Analytics & logs (optional) |

## WebSocket Architecture

### Connection
- **Path**: `/ws/trading/reasoning`
- **Shared singleton** per path (multiple components share one connection)
- Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 16s, max 5 attempts)
- Fallback polling every 30s when disconnected

### Event Types (20+)
| Category | Events |
|----------|--------|
| Connection | `connected`, `disconnected` |
| Migrations | `migration_detected`, `token_added`, `market_data_updated`, `migration_expired` |
| AI | `ai_reasoning`, `ai_analysis`, `no_market_data` |
| Signals | `signal_detected`, `wallet_signal`, `wallet_buy_detected` |
| Positions | `position_opened`, `price_update`, `take_profit_triggered`, `position_closed`, `stop_loss_triggered`, `holdings_snapshot` |
| Feed | `feed_update`, `stats_update` |
| Watchlist | `watchlist_added`, `watchlist_updated`, `watchlist_removed`, `watchlist_graduated` |

### Update Strategy
- **Surgical updates** for high-frequency events (price updates, holdings snapshots)
- **Full refetch** for structural changes (position open/close)
- Price updates don't spam activity feed

## Environment Variables

Required in `.env.local`:
```bash
# DevPrint Core (main backend)
NEXT_PUBLIC_DEVPRNT_CORE_URL=https://devprint-v2-production.up.railway.app

# Ponzinomics API (wallet signals, Twitter)
NEXT_PUBLIC_PONZINOMICS_API_URL=https://ponzinomics-production.up.railway.app
PONZINOMICS_API_KEY=your_api_key
PONZINOMICS_PROJECT_ID=your_project_id

# Gemini AI (entry analysis)
GEMINI_API_KEY=your_gemini_api_key

# Supabase (optional - analytics)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Feature flags (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true  # Enable version analytics dashboard
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run with Turbopack (faster)
npm run dev:turbo

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Important Files

### Entry Points
- `src/app/[locale]/cockpit/page.tsx` - Main trading dashboard
- `src/app/[locale]/page.tsx` - Homepage
- `src/app/[locale]/analytics-debug/` - Analytics debug page

### API Clients
- `src/lib/trading-api.ts` - Ponzinomics integration
- `src/lib/devprint-api.ts` - DevPrint AI streaming
- `src/lib/aiEntryAnalysis.ts` - Gemini AI token analysis
- `src/lib/priceTracking.ts` - Price monitoring
- `src/lib/tokenTrackingService.ts` - Token tracking

### State Management
- `src/features/smart-trading/context/` - Trading state (SmartTradingContext)
- `src/features/terminal/context/` - Terminal state (TerminalContext)

### SmartTradingContext State
```typescript
{
  config, dashboardStats, wallets, signals,
  positions, history, rankedMigrations, migrationStats,
  activityFeed, connectionStatus, clientId,
  isLoading, error, lastUpdated
}
```

### Selective Sub-Hooks (Performance)
- `useDashboardStats()` - Stats only
- `usePositions()` - Positions + history
- `useWalletSignals()` - Wallets + signals
- `useSmartTradingConfig()` - Config only
- `useMigrationFeedContext()` - Migration feed
- `useConnectionStatus()` - Connection status
- `useActivityFeed()` - Activity events

### Types
- `src/types/trading.ts` - Trading types
- `src/types/versioning.ts` - Version types
- `src/features/smart-trading/types.ts` - Smart trading types

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai-entry-analysis` | POST | Gemini AI token analysis (single or batch max 10) |
| `/api/token-tracking` | GET/POST | Token journey tracking cache |
| `/api/character/generate` | POST | AI character/persona generation |
| `/api/simulation/run` | POST | Trading simulation |
| `/api/twitter/seed` | GET/POST | Seed Twitter tracking data |
| `/api/twitter/accounts` | GET | Get tracked Twitter accounts |
| `/api/twitter/recent` | GET | Recent tweets (proxies to Ponzinomics) |
| `/api/twitter/quote` | GET/POST | Generate Twitter quotes |

## Conventions

### Component Pattern
- Feature modules in `src/features/`
- Each feature has: components/, hooks/, service.ts, types.ts, index.ts
- UI primitives in `src/components/ui/`

### State Management
- React Context for feature-level state
- Custom hooks for data fetching
- WebSocket for real-time updates

### Styling
- Tailwind CSS utility classes
- Design system colors defined in `DESIGN_SYSTEM.md` (root level)
- Custom animations in `src/app/vibr-animations.css`
- Glassmorphism and cyberpunk aesthetics

### API Client Pattern
- `devprint-api.ts` auto-converts snake_case ↔ camelCase
- Singleton instances exported at module level
- Strongly typed responses
- Error handling with try-catch

### Data Flow
1. WebSocket receives event → SmartTradingContext updates state
2. Surgical update for high-frequency data (prices, holdings)
3. Full refetch for structural changes (positions)
4. Activity feed captures user-facing events (50 max)
5. Terminal receives AI reasoning events separately

---

## Super Router Calls (Token-Gated Feature)

Token-gated section for exclusive trading insights, god wallet copy trading, and enhanced market intelligence.

### Feature Flag
```bash
NEXT_PUBLIC_ENABLE_SUPER_ROUTER_CALLS=true  # Enable SR Calls section (hidden in prod if false)
```

### Token Gating Configuration
```typescript
// src/lib/config.ts
SR_TOKEN_MINT = "48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump"  // $SR token
SR_MIN_BALANCE = 1000                                           // Minimum tokens to access
SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com"         // For balance checks
TOKEN_GATE_SESSION_DURATION = 12 * 60 * 60 * 1000              // 12 hours
```

### Architecture

```
src/features/super-router-calls/
├── components/
│   ├── SuperRouterCallsSection.tsx  # Main container (wrapped in TokenGateGuard)
│   ├── CompactAILog.tsx             # AI reasoning stream (WebSocket)
│   ├── GodWalletActivity.tsx        # God wallet buy feed
│   ├── EnhancedWatchlist.tsx        # Watchlist with tracker indicators
│   ├── TrackerWalletIndicator.tsx   # PFP avatars for tracked wallets
│   └── WalletEntryChart.tsx         # Price chart with wallet entry markers
├── hooks/
│   ├── useGodWallets.ts             # Fetch god wallets + listen for buys
│   ├── useTrackerWallets.ts         # Fetch active tracked wallets
│   └── useWalletEntries.ts          # Fetch wallet entries for tokens (batch + single)
├── types.ts                          # TrackerWallet, GodWalletBuy, etc.
└── index.ts                          # Exports

src/providers/
└── WalletProvider.tsx               # Phantom/Solflare/Backpack connection

src/components/auth/
├── WalletButton.tsx                 # Connect/disconnect UI with balance
└── TokenGateGuard.tsx               # Protects gated content

src/hooks/
├── useTokenGate.ts                  # Session management + gating logic
└── useTokenBalance.ts               # Fetch $SR balance from Solana RPC

src/lib/
├── config.ts                        # SR_TOKEN_MINT, SR_MIN_BALANCE, etc.
└── tokenGateSession.ts              # Cookie-based session storage
```

### Wallet Connection (No External Packages)

Uses browser wallet detection (window.solana, window.phantom, etc.):
- **Phantom**: `window.phantom.solana`
- **Solflare**: `window.solflare`
- **Backpack**: `window.backpack`

No API keys required. Balance check uses Solana RPC directly.

### Token Gating Flow

```
1. User visits → TokenGateGuard shows "Connect Wallet"
2. User connects → useTokenBalance fetches $SR balance from RPC
3. If balance ≥ 1000 → Session created (cookie, 12h expiry)
4. Content unlocked → SuperRouterCallsSection renders
5. Every 12h → Auto re-verify silently
```

### Backend Endpoints (DevPrint)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/wallets` | GET | List all tracked wallets |
| `/api/wallets/active` | GET | List active wallets only |
| `/api/wallets/god` | GET | List god wallets only |
| `/api/wallets/token/:mint` | GET | Wallets that bought a token |
| `/api/wallets/token/:mint/entries` | GET | Wallet entry points for chart |
| `/api/wallets/leaderboard` | GET | Wallet leaderboard by trust score |
| `/api/wallets/recent-buys` | GET | Recent buys from all wallets |

### Response Format

```typescript
// GET /api/wallets/god
{
  success: true,
  data: {
    wallets: [
      {
        id: "uuid",
        address: "wallet-address",
        label: "Whale Name",
        pfp_url: "https://...",
        twitter_handle: "@handle",
        trust_score: 0.95,
        is_god_wallet: true,
        is_active: true
      }
    ],
    total: 5
  }
}

// GET /api/wallets/token/:mint/entries
{
  success: true,
  data: [
    {
      timestamp: 1706000000000,      // Unix ms
      price: 0.000001234,            // USD at entry
      amount_sol: 0.15,
      amount_usd: 25.50,
      wallet_label: "Whale",         // Anonymous for god wallets
      is_god_wallet: true,
      tx_hash: "signature..."
    }
  ]
}
```

### WebSocket Events

| Event | Source | Data |
|-------|--------|------|
| `ai_reasoning` | `/ws/trading/reasoning` | `{ symbol, mint, reasoning, conviction, will_trade, timestamp }` |
| `god_wallet_buy_detected` | `/ws/trading` | `{ wallet_id, wallet_address, wallet_label, mint, symbol, amount_usd, copied_by_system }` |
| `wallet_buy_detected` | `/ws/trading` | Regular tracked wallet buys |

### Components

**SuperRouterCallsSection**: Main container
- Wrapped in `<TokenGateGuard>` for access control
- Shows header with "EXCLUSIVE" badge
- Contains CompactAILog, GodWalletActivity, EnhancedWatchlist

**CompactAILog**: AI reasoning stream
- Latest AI decision with conviction %
- Expandable history (10 items)
- Real-time via `/ws/trading/reasoning`

**GodWalletActivity**: God wallet buy feed
- Shows recent god wallet purchases
- "COPIED" badge if system auto-copied trade
- Real-time via `god_wallet_buy_detected` event

**EnhancedWatchlist**: Watchlist with charts
- Token cards with mini charts (100px)
- Click to open full chart modal (300px)
- Tracker wallet indicators on each card
- Links to DexScreener

**WalletEntryChart**: Price visualization
- Candlestick chart (lightweight-charts v5)
- Markers for wallet entries
- Yellow = God wallet ("🐋 Whale")
- Blue = Regular tracked wallet

### Database Schema (DevPrint/Supabase)

**tracked_wallets table:**
```sql
id: uuid PRIMARY KEY
address: text NOT NULL
chain: text DEFAULT 'solana'
label: text
trust_score: float DEFAULT 0.5
is_active: boolean DEFAULT true
pfp_url: text
twitter_handle: text
is_god_wallet: boolean DEFAULT false
wallet_group: text                    -- For multi-wallet clusters
group_buy_threshold: int DEFAULT 1    -- Min buys to trigger copy
```

**wallet_trades table:**
```sql
id: uuid PRIMARY KEY
wallet_id: uuid REFERENCES tracked_wallets
mint: text NOT NULL
action: text ('buy' | 'sell')
price_usd: float
amount_native: float                  -- SOL amount
amount_usd: float
timestamp: timestamptz
tx_hash: text
triggered_signal: boolean DEFAULT false
```

### God Wallet Copy Trading

When a god wallet buys:
1. Backend detects via Helius webhook
2. Checks group threshold (if grouped wallets)
3. Auto-executes copy trade (0.15 SOL default)
4. Broadcasts `god_wallet_buy_detected` event
5. Frontend shows buy + "COPIED" badge

**Position sizing:**
- Regular trades: `buy_amount_sol` config (0.3 SOL default)
- God wallet copies: `god_wallet_buy_amount_sol` config (0.15 SOL default)

### Known Issues / TODOs

1. ~~**EnhancedWatchlist**: `getWalletEntriesForToken()` returns empty array (mock)~~ ✅ FIXED
   - Created `useWalletEntries.ts` hook to fetch from `/api/wallets/token/:mint/entries`
   - Added `useMultipleWalletEntries()` for batch fetching

2. **WalletEntryChart**: Uses synthetic candle data from DexScreener
   - Real OHLCV should come from backend when available

3. ~~**Type Mismatch**: `WalletEntry` type in types.ts vs WalletEntryChart~~ ✅ FIXED
   - TrackerWalletIndicator now uses `WalletEntryPoint` type directly from hook
   - Types match backend response format

---

## God Wallet Copy Trading System

### Current State (Jan 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| God wallet buy detection | ✅ Working | Helius WebSocket detects buys |
| Recording buys to DB | ✅ Working | 360+ trades in `wallet_trades` |
| God wallet sell detection | ❌ Not implemented | Only buys tracked |
| Copy trade execution | ❌ Not implemented | Detection works, execution doesn't fire |
| Exit strategy | ❌ Not defined | No sell logic |

### God Wallets Configured (24 total)

| Label | Address | Trust Score |
|-------|---------|-------------|
| Profits | G5nxE...w5E | 0.9 |
| HighPnL-1 | 5h7yz...kfE | 0.85 |
| Remus | E4Rue...5S | 0.5 |
| Nikita | 8fSnL...LJ | 0.5 |
| marcell-1 to marcell-20 | Various | 0.8 |

### Backend Changes Required (DevPrint/Rust)

#### 1. Track God Wallet SELLS (not just buys)

**File:** `apps/core/src/trading/wallet_tracker/helius_tracker.rs`

```rust
// In handle_swap() - currently only handles buys
// Need to add sell detection:

if is_sell {
    // Record sell to wallet_trades with action='sell'
    db.record_trade(WalletTrade {
        wallet_id,
        mint,
        action: "sell".to_string(),
        price_usd: current_price,
        amount_tokens,
        amount_native,
        amount_usd,
        exit_price: Some(current_price),
        realized_pnl_pct: calculate_pnl(entry_price, current_price),
        realized_pnl_usd: calculate_pnl_usd(entry_amount, exit_amount),
        timestamp: Utc::now(),
        tx_hash: signature,
        ..Default::default()
    });

    // Emit WebSocket event
    emit_event("god_wallet_sell_detected", GodWalletSellEvent {
        wallet_label,
        mint,
        symbol,
        exit_price,
        realized_pnl_pct,
        hold_time_minutes,
    });
}
```

#### 2. Paper Trade Copy System

**New table:** `god_wallet_copy_paper_trades`

```sql
CREATE TABLE god_wallet_copy_paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source god wallet info
    source_wallet_id UUID REFERENCES tracked_wallets(id),
    source_wallet_label TEXT,
    source_buy_tx TEXT,
    source_buy_time TIMESTAMPTZ,
    source_buy_price FLOAT,
    source_buy_amount_usd FLOAT,

    -- Token info
    mint TEXT NOT NULL,
    token_symbol TEXT,
    token_name TEXT,

    -- Simulated copy trade
    simulated_entry_price FLOAT,           -- Price we would have gotten
    simulated_entry_sol FLOAT DEFAULT 0.1, -- Position size
    simulated_entry_time TIMESTAMPTZ,
    detection_latency_ms INT,              -- Time from their buy to our detection
    execution_latency_ms INT,              -- Simulated execution delay (add 500ms)
    price_slippage_pct FLOAT,              -- (our_price - their_price) / their_price

    -- Exit tracking (filled when god wallet sells)
    source_sell_tx TEXT,
    source_sell_time TIMESTAMPTZ,
    source_sell_price FLOAT,
    source_realized_pnl_pct FLOAT,         -- God wallet's actual PnL

    -- Our simulated exit
    simulated_exit_price FLOAT,
    simulated_exit_time TIMESTAMPTZ,
    simulated_pnl_pct FLOAT,               -- What we would have made
    simulated_pnl_sol FLOAT,

    -- Status
    status TEXT DEFAULT 'open',            -- 'open', 'closed_copy_sell', 'closed_timeout', 'closed_stop_loss'

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_paper_trades_status ON god_wallet_copy_paper_trades(status);
CREATE INDEX idx_paper_trades_source_wallet ON god_wallet_copy_paper_trades(source_wallet_id);
CREATE INDEX idx_paper_trades_mint ON god_wallet_copy_paper_trades(mint);
```

#### 3. Copy Trade Flow (Paper Trading)

```
GOD WALLET BUY DETECTED
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Record to wallet_trades (existing)   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. Create paper trade record            │
│    - source_wallet_label                │
│    - source_buy_price                   │
│    - simulated_entry_price (+slippage)  │
│    - simulated_entry_sol = 0.1          │
│    - detection_latency_ms               │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. Emit WebSocket event                 │
│    god_wallet_buy_detected {            │
│      paper_trade_id,                    │
│      simulated: true                    │
│    }                                    │
└─────────────────────────────────────────┘


GOD WALLET SELL DETECTED
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Find matching open paper trade       │
│    WHERE source_wallet_id = X           │
│    AND mint = Y                         │
│    AND status = 'open'                  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. Calculate simulated exit             │
│    - simulated_exit_price               │
│    - simulated_pnl_pct                  │
│    - simulated_pnl_sol                  │
│    - source_realized_pnl_pct            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. Update paper trade                   │
│    status = 'closed_copy_sell'          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. Emit WebSocket event                 │
│    god_wallet_copy_closed {             │
│      paper_trade_id,                    │
│      simulated_pnl_pct,                 │
│      simulated_pnl_sol,                 │
│      source_pnl_pct                     │
│    }                                    │
└─────────────────────────────────────────┘
```

### Exit Strategy

**Primary: Copy their sells**
- When god wallet sells, we sell (they're god wallets for a reason)
- Calculate our simulated exit based on their exit price + slippage

**Fallback exits (if they don't sell within 4 hours):**

| Condition | Action |
|-----------|--------|
| Price drops 25% from peak | Stop loss exit |
| Price up 50%+ after 4h | Take profit exit |
| 4 hours elapsed, price flat | Timeout exit |

### Position Sizing

| Trade Type | SOL Amount | Notes |
|------------|------------|-------|
| Migration signal | 0.3 SOL | Current default |
| God wallet copy (paper) | 0.1 SOL | Conservative for testing |
| God wallet copy (live) | 0.1 SOL | Start small, increase if profitable |

### API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/god-wallet-copies` | GET | List paper trades with PnL |
| `/api/god-wallet-copies/stats` | GET | Aggregate stats (win rate, total PnL) |
| `/api/god-wallet-copies/:id` | GET | Single paper trade details |

### WebSocket Events Needed

| Event | Data |
|-------|------|
| `god_wallet_sell_detected` | `{ wallet_label, mint, symbol, exit_price, realized_pnl_pct, hold_time_minutes }` |
| `god_wallet_copy_opened` | `{ paper_trade_id, wallet_label, mint, simulated_entry_price, simulated_entry_sol }` |
| `god_wallet_copy_closed` | `{ paper_trade_id, simulated_pnl_pct, simulated_pnl_sol, close_reason }` |

### Frontend Display (SR Calls Section)

**New component:** `GodWalletCopyPerformance`

```
┌─────────────────────────────────────────────────┐
│ 📊 God Wallet Copy Performance (Paper Trading)  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Today's Simulated PnL: +0.45 SOL (+15%)       │
│  Open Positions: 3                              │
│  Win Rate: 67% (8/12)                          │
│                                                 │
│  Recent Copies:                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🐋 Profits bought BONK                  │   │
│  │ Entry: $0.00001234 | Our entry: +2.1%   │   │
│  │ Status: OPEN | Current: +18%            │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 🐋 marcell-13 sold PEPE                 │   │
│  │ Their PnL: +45% | Our PnL: +41%         │   │
│  │ Slippage: -4% | Hold: 2.3h              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Implementation Priority

1. **Phase 1: Track Sells** (Backend)
   - Add sell detection to Helius tracker
   - Record sells to wallet_trades
   - Emit `god_wallet_sell_detected` event

2. **Phase 2: Paper Trading** (Backend)
   - Create `god_wallet_copy_paper_trades` table
   - Create paper trade on god wallet buy
   - Close paper trade on god wallet sell
   - API endpoints for paper trade data

3. **Phase 3: Frontend Display** (Frontend)
   - New component to show paper trade performance
   - Real-time updates via WebSocket
   - Daily/weekly PnL summaries

4. **Phase 4: Live Trading** (Backend)
   - Replace paper trade creation with real execution
   - Use `force_buy_no_filters()` with 0.1 SOL
   - Implement exit logic (copy sells + fallbacks)
