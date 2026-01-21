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
- 2026-01-16: Outcome Pulse container padding increased for more breathing room.
- 2026-01-16: Outcome Pulse win-rate ring enlarged with stronger stroke, and metric labels increased in size.
- 2026-01-16: Outcome Pulse secondary metrics now sit in a single-row layout on mobile with tighter text.
- 2026-01-16: Outcome Pulse overview now lays out the three secondary metrics in a horizontal grid with stacked labels.
- 2026-01-16: Outcome Pulse overview now emphasizes a larger PnL row with bigger text, borderless rows, and sign-only green/red coloring.
- 2026-01-16: AI analysis logging now reports Supabase error details for easier debugging.
- 2026-01-16: Removed the token performance rankings and summary stats blocks from Trading Analytics for the initial release.
- 2026-01-16: Nudged the Analytics NEW badge further up and right again.
- 2026-01-16: Shifted the Analytics NEW badge up and further right.
- 2026-01-16: Nudged the Analytics NEW badge further right for clearer separation.
- 2026-01-16: Added a small NEW badge to the Analytics tab trigger.
- 2026-01-16: Increased mobile Trade Outcomes toggle button sizing for better readability.
- 2026-01-14: Transaction History now lives beside Live Activity and Active Positions as a collapsible rail on desktop, removing the bottom-row duplication.
- 2026-01-14: Smart Money panel now sits at half-screen height with a single-column list so each wallet spans the full width vertically.
- 2026-01-14: Live Activity rail no longer embeds Recent Trades; history sits in its own dedicated panel.
- 2026-01-14: VIBR wallet history now reads from the trading transactions feed (same source as the dashboard Transaction History panel) instead of derived position closures.
- 2026-01-14: On-chain holdings now auto-uses the trading wallet (or ?wallet= query param) so the panel no longer throws missing-wallet errors.
- 2026-01-14: Trading config now falls back to public wallet `FXP5NMdrC4qHQbtBy8dduLbryVmevCkjd25mmLBKVA7x` when none is returned from the backend.
- 2026-01-14: Trading Configuration card removed from the dashboard.
- 2026-01-15: Overall Trading Analytics removed the large top metric cards to keep focus on the charts and outcome panels.
- 2026-01-15: Overall Trading Analytics now mirrors the compact 4-up summary row with separators above the charts.
- 2026-01-15: Overall Trading Analytics now focuses on trade outcomes, efficiency, and rankings without the P&L trend chart or summary row.
- 2026-01-15: Overall Trading Analytics now uses transparent panels with light borders and positions the TP hit-rate metrics above Trade Outcomes.
- 2026-01-15: TP hit-rate metrics now match the minimal separator style used in the analytics summary row.
- 2026-01-15: Trade Outcomes chart swapped to a radial stacked view with win/loss, TP hits, and target efficiency toggles.
- 2026-01-15: Removed the standalone TP hit-rate strip since the radial chart covers those metrics.
- 2026-01-15: Overall Trading Analytics header now omits the subtitle and date-range tag for a cleaner top line.
- 2026-01-15: Trade Outcomes chart text and tooltip now use light-on-dark slate tones instead of black defaults.
- 2026-01-15: Trade Outcomes header removed and the radial chart resized to a wider, shorter layout.
- 2026-01-15: Trade Outcomes controls and metrics restyled with bolder typography, separators, and brand-accented pills.
- 2026-01-15: Trade Outcomes toggles now sit on one row and the efficiency view is labeled Accuracy.
- 2026-01-15: Trade Outcomes chart now takes less width with a wider details column, centered chart, and brand-tinted muted tones.
- 2026-01-15: Trade Outcomes toggles centered, borders removed, and a vertical separator added between chart and details.
- 2026-01-15: Trade Outcomes toggle buttons now show pointer cursors on hover.
- 2026-01-15: Removed the temporary accuracy buffer so the chart only shows Hit vs Miss.
- 2026-01-15: Accuracy view now centers on the hit percentage (no 100% total label).
- 2026-01-15: CA copy toast now reads "$SR CA copied" instead of "Copied!".
- 2026-01-15: Wallet copy action now shows a “Super Router trading address copied” toast on the trader profile card.
- 2026-01-15: Trade Outcomes radial chart height reduced again for a tighter layout.
- 2026-01-15: Trade Outcomes radial chart height trimmed to remove extra bottom space.
- 2026-01-15: Trade Outcomes radial chart centered within its container.
- 2026-01-15: Trade Outcomes radial chart vertical alignment adjusted downward.
- 2026-01-15: Trade Outcomes radial chart size increased for more visual weight.
- 2026-01-15: Mobile smart trading dashboard now uses tighter side padding to free horizontal space.
- 2026-01-15: Overall trading analytics title now uses the two-word "Outcome Pulse" label with a Radar icon.
- 2026-01-15: Trade Outcomes right-hand metrics now use larger text and more side padding.
- 2026-01-15: Trade Outcomes toggles now stay on a single row, with "TP'S" label and a larger mobile chart.
- 2026-01-15: Portfolio holdings move entry value to the top-right on mobile and free full-width space for the progress bar.
- 2026-01-15: Portfolio holdings now place entry + market cap details under the ticker and run the progress bar full width.
- 2026-01-15: Market cap labels now read Entry and MCap and align to the left under the ticker.
- 2026-01-15: Outcome Pulse panel now only appears under the Analytics tab (removed from the trading view).
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
