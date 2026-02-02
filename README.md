# SuperRouter

**Autonomous market routing intelligence for Solana.**

Humans trade narratives. Systems trade flows.

[superrouter.fun](https://superrouter.fun)

---

## What is SuperRouter?

SuperRouter is an AI-powered trading intelligence platform that monitors Solana tokens in real-time, detects trading opportunities through tracked whale wallets and AI analysis, and provides autonomous position management with zero emotional interference.

It is not a trading bot in the conventional sense. It is the routing layer — aggregating signals, decomposing flows, and executing decisions faster than any human can react.

### Core Capabilities

- **Real-time DEX liquidity aggregation** via Jupiter V6 across Raydium, Orca, and Meteora
- **God wallet tracking** — 24 tracked whale wallets with 360+ recorded trades, entry point visualization, and copy-trade infrastructure
- **AI entry analysis** — Gemini-powered token evaluation with conviction scoring across 11+ buy criteria (market cap, liquidity, holders, momentum, distribution, trust score, volume spikes, social sentiment)
- **WebSocket-driven dashboard** — 21+ real-time event types, surgical state updates every 2 seconds for holdings and prices
- **Token-gated access** — exclusive features locked behind $SR token holdings (1000 minimum)
- **Matrix-themed AI terminal** — real-time reasoning stream with personality-driven narration

---

## Architecture

```
                    +------------------+
                    |   Next.js 16     |
                    |   App Router     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v--+   +------v------+  +----v--------+
     | WebSocket  |   | REST API    |  | AI Engine   |
     | (socket.io)|   | (Next.js)   |  | (Gemini)    |
     +--------+---+   +------+------+  +----+--------+
              |              |              |
     +--------v--------------v--------------v--------+
     |              DevPrint Core Backend             |
     |         (Rust trading engine on Railway)       |
     +--------+---+---+--------+----+----------------+
              |       |        |    |
        +-----v-+ +---v---+ +-v----v-+ +-----------+
        |Jupiter | |Helius | |Birdeye | | Supabase  |
        |  V6    | | RPC   | | Proxy  | | Analytics |
        +--------+ +-------+ +--------+ +-----------+
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + Glassmorphism + CRT effects |
| Components | shadcn/ui + Radix UI |
| Charts | Recharts + lightweight-charts v5 (candlestick) |
| Animations | GSAP + Framer Motion |
| Real-time | socket.io-client (shared singleton, auto-reconnect) |
| AI | Google Gemini API |
| Database | Supabase PostgreSQL |
| Deployment | Railway (Nixpacks) |
| i18n | next-intl (EN/ZH) |

---

## Features

### Smart Trading Dashboard

The main control surface. Monitors token migrations, tracks open positions with TP/SL management, and displays real-time AI reasoning.

- **Migration Feed** — detects new token migrations with AI confidence scoring
- **Position Management** — TP1/TP2/TP3 targets and stop-loss tracking per position
- **On-Chain Holdings** — live snapshot updated every 2 seconds
- **Activity Feed** — 50-item rolling event history (buys, sells, migrations, signals)
- **Wallet Signals** — tracked wallet buy detection with metadata

### God Wallet Calls (Token-Gated)

Exclusive whale tracking interface. Groups buys by token (not wallet), shows entry market cap, current performance, and mini candlestick charts with PFP markers at entry points.

- **Token:** `$SR` (`48BbwbZHWc8QJBiuGJTQZD5aWZdP3i6xrDw5N9EHpump`)
- **Minimum:** 1,000 tokens
- **Session:** 12-hour cookie-based access
- **Wallets:** Phantom, Solflare, Backpack

### AI Terminal

Matrix-themed reasoning display. Streams the AI's decision-making process in real-time with boot animations, mood states, and personality-driven output.

Mood states: `idle` > `scanning` > `executing` > `bullish` / `bearish` / `sleeping`

### Portfolio Tracking

Entry SOL value tracking, unrealized + realized P&L, peak price monitoring. All sourced from Birdeye as single source of truth.

### Token Analysis

Historical token tracking with retracement detection, AI-generated signals (`strong_buy`, `buy`, `watch`, `avoid`), and market data from DexScreener.

---

## Solana Integration

SuperRouter integrates with Solana at multiple levels:

- **Jupiter V6** — swap execution and multi-hop route optimization
- **Helius RPC** — real-time transaction monitoring via webhooks (god wallet buy detection)
- **Birdeye** — price feeds, OHLCV data, portfolio valuation (proxied through custom WebSocket server)
- **SPL Token Program** — token balance verification for gating
- **Jito** — MEV-protected bundle submission for trade execution
- **DexScreener** — token metadata, pair data, market stats

---

## Project Structure

```
src/
  app/                    # Next.js App Router
    [locale]/             # i18n routing (EN/ZH)
    api/                  # API routes (AI analysis, token tracking, twitter, competition)
  features/
    smart-trading/        # Main dashboard (context, components, types)
    super-router-calls/   # Token-gated god wallet tracking
    terminal/             # AI narrator (Matrix theme)
    portfolio-wallet/     # Holdings & P&L
    pump-history/         # Token analysis & signals
    trading-competition/  # Leaderboard system
  components/
    ui/                   # shadcn/ui primitives
    design-system/        # Layout components (Grid, Panel, Header)
    animations/           # GSAP/Framer Motion effects
    auth/                 # WalletButton, TokenGateGuard
  lib/                    # API clients, config, utilities
    devprint-api.ts       # DevPrint backend client
    trading-api.ts        # Position data (Birdeye P&L)
    aiEntryAnalysis.ts    # Gemini integration
    useWebSocket.ts       # Shared WebSocket singleton
  server/
    birdeye-proxy.ts      # WebSocket proxy (production entry point)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Environment

Create `.env.local`:

```bash
# DevPrint Core (trading backend)
NEXT_PUBLIC_DEVPRNT_CORE_URL=https://devprint-v2-production.up.railway.app

# Ponzinomics API (wallet signals)
NEXT_PUBLIC_PONZINOMICS_API_URL=https://ponzinomics-production.up.railway.app
PONZINOMICS_API_KEY=
PONZINOMICS_PROJECT_ID=

# Gemini AI
GEMINI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Feature flags
NEXT_PUBLIC_ENABLE_SUPER_ROUTER_CALLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Development

```bash
npm run dev          # webpack dev server
npm run dev:turbo    # turbopack (faster)
```

### Production

```bash
npm run build
npm start
```

---

## Deployment

Deployed on Railway with Nixpacks. The production entry point is the custom WebSocket proxy server (`src/server/birdeye-proxy.ts`) which handles Birdeye price feed proxying alongside the Next.js application.

```bash
# Start command (Railway)
node --require tsx/cjs --import tsx/esm src/server/birdeye-proxy.ts
```

---

## WebSocket Events

SuperRouter uses 21+ real-time event types over socket.io:

| Category | Events |
|----------|--------|
| Connection | `connected`, `disconnected` |
| Migrations | `migration_detected`, `token_added`, `market_data_updated`, `migration_expired` |
| AI | `ai_reasoning`, `ai_analysis`, `no_market_data` |
| Signals | `signal_detected`, `wallet_signal`, `wallet_buy_detected` |
| Positions | `position_opened`, `price_update`, `take_profit_triggered`, `position_closed`, `stop_loss_triggered`, `holdings_snapshot` |
| Feed | `feed_update`, `stats_update` |
| Watchlist | `watchlist_added`, `watchlist_updated`, `watchlist_removed`, `watchlist_graduated` |

---

## Design System

Cyberpunk-meets-terminal aesthetic built on Tailwind CSS v4 with CSS variables.

- **Backgrounds:** Void blacks (`#000000` to `#1a1a1a`)
- **Primary:** `#68ac6e` (brand green)
- **Accents:** Matrix green (`#00ff41`), Solana purple (`#9945ff`), Solana cyan (`#14f195`), Alert red (`#ff0033`)
- **Typography:** Space Grotesk (display), Inter (body), JetBrains Mono (terminal)
- **Effects:** CRT scanlines, glassmorphism, glow states

---

## License

Proprietary. All rights reserved.
