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
