# Changelog

All notable changes to Opus-X are documented here.

## 2026-01-16
- Added a desktop-only target cursor overlay that locks onto hoverable elements and hides the default cursor.
- Target cursor now locks onto smart trading watchlist cards and transaction rows.
- Analytics chart comparison loading now uses a spinner instead of the gif background.
- Analytics summary row now uses shorter labels, a Solana icon for PnL, and one-decimal precision.
- Analytics summary row hides Avg Hold on mobile to keep spacing tight.
- Analytics mobile metric selector now sits to the right of the version badges and uses a compact size.
- Analytics mobile summary row text increased now that it shows three metrics.
- Analytics mobile metric selector hides the label and uses a brand-green chevron.
- Analytics agent version chart now uses a borderless container, more height, and larger dots.
- Analytics desktop version chips now live inside the chart header and the chart spans full width with a shorter desktop height.
- Analytics desktop summary values and chart version chips now render larger.
- Analytics desktop summary metrics now stack to the right of the chart and use about a quarter of the width.
- Analytics summary column now uses single-line label/value rows with larger text.
- Analytics summary labels now use a brighter gray and heavier weight.
- Analytics stat cards now use smaller values with reduced glow overflow and tighter height.
- Analytics stat cards now stack vertically with tighter padding and smaller values.
- Analytics stat cards now use tighter gaps and padding, with a taller chart.
- Analytics stat cards are now borderless and the chart shrank to give them more space.
- Analytics stat column width trimmed and the chart gained left/bottom borders plus extra height.
- Analytics stat cards now use tighter corners and show a green arrow during count-up increases.
- Analytics agent metrics chart now filters to the selected version data only.
- Analytics version chart now remounts on version changes and uses per-version line colors.
- Analytics desktop metric selector now sits at the chart’s top-right edge.
- AI analysis logging now reports Supabase error details for easier debugging.
- Trade Outcomes mobile toggle buttons now use larger text and padding.
- Analytics tab trigger now shows a small NEW badge.
- Analytics NEW badge shifted further right.
- Analytics NEW badge moved slightly upward and further right.
- Analytics NEW badge nudged further upward and right.
- Trading Analytics initial release hides token performance rankings and summary stats.

## 2026-01-15
- Pump.fun wallet pill received a max z-index so the balance badge always floats above overlapping feeds on the dashboard.
- Analytics dashboard comparison loading no longer retriggers continuously when the selected version list is unchanged.
- Analytics dashboard versions rail now shows just the version name and takes up less width.
- Analytics dashboard removed the redundant top metric card row to keep the focus on the detailed panels.
- Analytics dashboard now shows readable version names and uses line chart styling with chart-config labels.
- Analytics dashboard now maps versioning API responses to camelCase so version names and metrics display instead of blank fields.
- Analytics dashboard metric choice is now a single selector and the performance header sits above the chart container.
- Analytics dashboard versions now show V1/V2 codes with inactive styling muted to light grey across tabs and chart lines.
- Analytics dashboard header now reads Agent Metrics and the metric label sits above the selector.
- Analytics dashboard versions rail separator now fades with a gradient for a cleaner edge.
- Analytics dashboard now shows a compact 4-up summary row under Agent Metrics, and the overall trading analytics view drops the oversized metric cards.
- Analytics dashboard summary row now centers values, rounds percentages, uses two-decimal SOL, and labels Trades instead of Total Trades.
- Analytics dashboard header description removed and summary row uses separators instead of individual cards.
- Analytics dashboard summary separators are now shorter and a soft divider separates the header from the metrics row.
- Analytics dashboard chart height reduced for a tighter agent metrics panel.
- Analytics dashboard loading state now uses the `gif.gif` asset instead of the spinning icon.
- Analytics dashboard chart height reduced again and the version details card removed.
- Analytics dashboard version tabs and metric selector now show pointer cursors on hover.
- Analytics dashboard Agent Metrics header icon/text size increased.
- Analytics dashboard mobile view now shows version badges over the chart instead of the left rail.
- Analytics dashboard mobile content padding tightened to use the full width.
- Analytics dashboard chart no longer shows horizontal grid lines.
- Analytics dashboard summary row text reduced on mobile and padding tightened for full-width fit.
- Overall Trading Analytics now uses a compact 4-up summary row with separators above the charts.
- Overall Trading Analytics focuses on trade outcome panels while the P&L trend chart and summary metrics remain hidden.
- Overall Trading Analytics panels now use transparent styling and TP hit-rate metrics sit above Trade Outcomes.
- Overall Trading Analytics TP hit-rate metrics now use the same minimal separator styling as the analytics summary row.
- Trade Outcomes now uses a radial stacked chart with toggles for win/loss, TP hits, and target efficiency.
- Overall Trading Analytics no longer shows the redundant TP hit-rate strip.
- Overall Trading Analytics header removed the subtitle and date-range tag.
- Trade Outcomes header removed and the radial chart resized to a wider, shorter layout.
- Trade Outcomes controls and metric list restyled for stronger hierarchy and cleaner separators.
- Trade Outcomes toggles now fit on a single row and the efficiency view is labeled Accuracy.
- Trade Outcomes chart now uses a narrower chart column, centered chart, and brand-tinted muted tones.
- Trade Outcomes toggles centered with no borders and a vertical separator added between chart and content.
- Trade Outcomes accuracy chart now only shows Hit vs Miss (no buffer segment).
- Trade Outcomes accuracy label now reflects the hit percentage instead of the full 100% total.
- Trade Outcomes toggle buttons now show pointer cursors on hover.
- CA copy toast now reads "$SR CA copied" instead of "Copied!".
- Trader profile wallet copy now shows a “Super Router trading address copied” toast.
- Trade Outcomes radial chart height reduced for a tighter layout.
- Trade Outcomes radial chart height trimmed to remove extra bottom space.
- Trade Outcomes radial chart centered within its container.
- Trade Outcomes radial chart vertical alignment adjusted downward.
- Trade Outcomes radial chart size increased for more visual weight.
- Smart trading dashboard uses tighter mobile side padding to maximize width.
- Overall trading analytics title now shows "Outcome Pulse" with a Radar icon.
- Trade Outcomes right-side metrics now use larger text and extra horizontal padding.
- Trade Outcomes toggles stay on one row, "TP'S" label added, and mobile chart height increased.
- Trade Outcomes radial chart now uses lighter text and tooltip tones to avoid black defaults.
- Portfolio holdings now move the entry value to the top-right on mobile to free space for the progress bar.
- Portfolio holdings now place entry/market cap info under the ticker with a full-width progress bar below.
- Portfolio holdings now show Entry and MCap labels on the left under the ticker.
- Outcome Pulse panel now only appears under the Analytics tab.
- Analytics chart loading state now uses the gif as a full panel background with a dark overlay.
- Analytics chart now uses thicker lines with visible data point dots.
- Analytics chart now uses thicker lines and preserves the first/last date labels on the X-axis.
- Analytics chart line weight reduced and brand green toned down to let dots pop.
- Analytics summary stats now render two per row on mobile.
- Analytics metric selector now sits on the Agent Metrics title row.

## 2026-01-14
- Transaction History now sits alongside Live Activity and Active Positions in the top desktop rail as its own collapsible column, eliminating the bottom-row copy.
- Smart Money panel is fixed to roughly half-screen height with a single-column vertical list so each tracked wallet uses the full width.
- Live Activity rail no longer embeds the Recent Trades widget; the history stays in its own panel instead.
- VIBR wallet history now pulls from the trading transactions feed (same as the Smart Trading Transaction History panel) instead of inferred position closures.
- On-chain holdings panel now defaults to the trading wallet (or ?wallet= override) so it loads without the missing-wallet error.
- Trading config now falls back to the provided public wallet `FXP5NMdrC4qHQbtBy8dduLbryVmevCkjd25mmLBKVA7x` when the backend doesn’t send one, keeping holdings and balances in sync.
- Removed the Trading Configuration card from the dashboard per request.

## 2026-01-12
- Migration cards replaced their token-name row with a minimalist inline stat strip (MCap · Liq · Score) separated by subtle dividers directly beneath the ticker.
- Tracked wallet presets were enriched with Orange, Dior, Jack Duval, and POW Twitter handles, and they now default to the SuperRouter avatar whenever no profile image is provided.
- Tracked wallet panel switched to a two-column grid with slimmer, gradient cards so more operators are visible at once without endless scrolling.
- Hero terminal toggle no longer sits over the video; the pill hides while the terminal is open and only returns when collapsed so the hero stays clean.
- Mobile dashboard automatically scrolls the active live/migration/positions panel into view, ensuring phones always show one expanded section without manual sideways scrolling.
- Accordion behavior for the Live Activity, Migration Feed, and Positions stack now only applies on mobile, restoring independent collapsible panels on desktop.
- Fixed mobile panel switcher so only the selected section renders (no sideways-collapsing migration feed) and positions no longer stack beneath it.
- Migration feed code is retained for reference but the panel is hidden from the Smart Trading dashboard UI.
- Mobile section switcher restyled into a pill tab with a sliding highlight for Live Activity vs Active Positions.
- Added animated glow + icons to the mobile pill switcher to echo the wallet badge styling.
- Language toggle now lives in the hero’s top-right overlay for clearer locale switching.
- When a desktop panel collapses, its column now shrinks so neighboring panels slide over instead of leaving empty space.
- Narrow desktops (<1300px) enforce a two-panel limit so opening a third column auto-collapses the oldest expanded one for better readability.
- Language switcher now rewrites paths to the selected locale so the English/中文 toggle works consistently across the dashboard.
- Language switching also persists by writing the `NEXT_LOCALE` cookie before routing, preventing the middleware from forcing a redirect back to the previous language.
- Portfolio wallet pill sticks to the viewport, keeping balance stats visible as users scroll down the cockpit layout.
- Migration feed cards pack their stats into inline pills within the header row, reducing height so more items fit on screen.
- Migration cards dropped their bottom controls, moved copy + timestamp into the header, and now show all metrics as inline labels beneath the ticker for the most compact layout yet.
- Shared UI button component now forces a pointer cursor (with disabled overrides) so every button feels interactive.
- Mobile smart trading stack replaces the accordion with a three-button switcher that flips between Live Activity, Migration Feed, and Positions, hiding the side toggles on phones.
- Removed the floating “Super Router” text badge from the trader profile card and increased the margin between the hero video and dashboard content to reduce visual crowding.
- Trader profile metrics on the Smart Trading card now keep streak/trade/best stats visible on mobile by shifting them below the main pill while retaining the inline desktop view.
- Tracked wallet rows now surface a single inline address pill with copy state beside each name, showing the first four characters clearly.
- Seeded the Smart Trading tracked wallets panel with the Orange focus set client-side (unnamed entries display “Rando Router” until we map real handles).
- Migration feed card now supports collapsing like the live activity rail, and the Active Positions + Recent Signals stack sits inside its own collapsible container for easier focus management.

## 2026-01-10
- Updated Smart Trading dashboard with a compact trader profile card combining character art and key metrics.
- Refined Smart Trading metrics into a stacked, inline layout and made the trader character card visually distinct.

## 2026-01-08
- Added initial Next.js shell and layout.
- Introduced design system primitives (Panel, SectionHeader, StatusPill).
- Added initial documentation structure.
- Added Pump History section scaffold (stats, filters, token table) backed by Supabase.
- Added terminal provider with live logging hooks.
- Added Simulation + Twitter dashboard section with tracked account list and recent tweet feed.
- Added Opus-X server routes for seeding tracked accounts and fetching recent tweets.
- Switched Simulation + Twitter feed to devprnt J7 WebSocket stream (`/ws/tweets`).
- Added AI simulation scoring pipeline for tweets with confidence + decision display.
- Added 3D character generation trigger for queued AI tweet decisions.
- Added quote tweet automation after 3D queue triggers.
