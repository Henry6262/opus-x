# Changelog

All notable changes to Opus-X are documented here.

## 2026-01-10
- Updated Smart Trading dashboard with a compact trader profile card combining character art and key metrics.

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
