# Changelog

All notable changes to Opus-X are documented here.

## 2026-01-14
- Transaction History now sits alongside Live Activity and Active Positions in the top desktop rail as its own collapsible column, eliminating the bottom-row copy.
- Smart Money panel is fixed to roughly half-screen height with a single-column vertical list so each tracked wallet uses the full width.

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
