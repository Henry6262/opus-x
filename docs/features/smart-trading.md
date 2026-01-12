# Feature: Smart Trading (Smart Money Copy Trading)

## Purpose
Mirror trades from curated "smart money" wallets on Solana, managing entries, position sizing, and exits automatically based on live on-chain activity.

## Data Sources
- Ponzinomics Smart Trading API endpoints
- Wallet tracking service for curated addresses
- On-chain price and position data for P&L and exposure

## UI Sections
- Smart trading status header with live/pause controls
- Trader profile card with character art and stacked, inline metrics
- Tracked wallets list with Twitter metadata and Solscan links
- Recent smart money signals feed
- Open positions list with P&L, targets, and stop status
- Trading config summary (targets, stop loss, slippage, limits)

## Changelog
- 2026-01-12: Trader profile metrics now stay readable on mobile with streak/trade/best stats moving below the hero pill while desktop keeps the inline layout.
- 2026-01-12: Tracked wallet rows now show a single inline pill next to each name with the first four address characters and a copy action.
- 2026-01-12: Seeded the Orange focus tracked wallets client-side, defaulting unnamed wallets to “Rando Router” so operators can fill in handles later.
- 2026-01-12: Migration feed now includes a header collapse toggle and the positions/signals sidebar lives in a combined collapsible card for quicker triage.
- 2026-01-10: Added trader profile card with character art and compact metrics layout.
- 2026-01-10: Refined trader card UI to stack metrics without individual containers and highlight the character card visually.
