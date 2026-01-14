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
- 2026-01-14: Transaction History now lives beside Live Activity and Active Positions as a collapsible rail on desktop, removing the bottom-row duplication.
- 2026-01-14: Smart Money panel now sits at half-screen height with a single-column list so each wallet spans the full width vertically.
- 2026-01-12: Mobile dashboard now swaps Live Activity, Migration Feed, and Positions with a dedicated three-button switcher (no more per-card collapse toggles on phones).
- 2026-01-12: Migration cards replaced the token name row with a minimalist inline stat strip (MCap · Liq · Score) separated by subtle dividers directly beneath the ticker.
- 2026-01-12: Tracked wallet presets now include Orange, Dior, Jack Duval, and POW Twitter handles, falling back to the SuperRouter avatar whenever a profile image is missing.
- 2026-01-12: Tracked wallet cards now render in a responsive two-column grid with compact gradient tiles so the list shows twice as many wallets without scrolling.
- 2026-01-12: Language switcher now rewrites paths for the selected locale so hopping between English and 中文 always updates the dashboard.
- 2026-01-12: Language switcher now sets the `NEXT_LOCALE` cookie before navigating so the middleware stops redirecting back to the previous language.
- 2026-01-12: The top-left wallet pill stays fixed to the viewport, keeping live balance context visible while scrolling the cockpit.
- 2026-01-12: Migration cards trimmed further—controls removed, copy action sits beside the ticker, and the detection timestamp lives in the top-right for a true single-row glance.
- 2026-01-12: Mobile view now auto-scrolls the active live/migration/positions panel into view so there's always one expanded section visible without swiping around.
- 2026-01-12: The accordion behavior for Live Activity / Migration Feed / Positions is now mobile-only; desktop keeps independent collapses so multiple panels can stay open.
- 2026-01-12: Desktop collapsible panels now shrink their entire column when collapsed so adjacent panels slide over and fill the freed space.
- 2026-01-12: On compact desktops (<1300px wide) only two panels can remain expanded simultaneously—opening another automatically collapses the oldest open column.
- 2026-01-12: The hero terminal toggle no longer hovers over the video; the pill only appears when the terminal is collapsed, keeping the hero unobstructed while still making the reopen action obvious.
- 2026-01-12: Shared button component now enforces a pointer cursor (and disabled cursor states) for consistent affordance cues.
- 2026-01-12: Removed the floating “Super Router” tag from the trader card and increased spacing below the hero section so the dashboard content breathes more on all breakpoints.
- 2026-01-12: Trader profile metrics now stay readable on mobile with streak/trade/best stats moving below the hero pill while desktop keeps the inline layout.
- 2026-01-12: Tracked wallet rows now show a single inline pill next to each name with the first four address characters and a copy action.
- 2026-01-12: Seeded the Orange focus tracked wallets client-side, defaulting unnamed wallets to “Rando Router” so operators can fill in handles later.
- 2026-01-12: Migration feed now includes a header collapse toggle and the positions/signals sidebar lives in a combined collapsible card for quicker triage.
- 2026-01-12: Migration feed remains in code for reference but is hidden from the Smart Trading dashboard UI.
- 2026-01-12: Mobile section switcher now uses a branded pill-style tab with a sliding highlight for Live Activity vs Active Positions.
- 2026-01-12: Mobile switcher pills now include animated glow + icons for each section to match the wallet badge style.
- 2026-01-14: Language toggle moved to the hero’s top-right overlay so locale switching is always visible before the dashboard.
- 2026-01-10: Added trader profile card with character art and compact metrics layout.
- 2026-01-10: Refined trader card UI to stack metrics without individual containers and highlight the character card visually.
