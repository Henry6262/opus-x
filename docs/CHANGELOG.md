# Changelog

All notable changes to Opus-X are documented here.

## 2026-01-12
- Tracked wallet rows now surface a single inline address pill with copy state beside each name, showing the first four characters clearly.
- Seeded the Smart Trading tracked wallets panel with the Orange focus set client-side (unnamed entries display “Rando Router” until we map real handles).

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
