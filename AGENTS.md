# Opus-X Agent Guide

Read this file first. It is the navigation entrypoint for every agent.

## Quick Links
- Project index: `docs/INDEX.md`
- Structure rules: `docs/STRUCTURE.md`
- Design system: `docs/DESIGN_SYSTEM.md`
- Feature docs: `docs/features/`
- Changelog: `docs/CHANGELOG.md`

## Project Goals
- Single-page dashboard that hosts all Opus-X features.
- Reuse backend logic from devprnt + Ponzinomics API.
- Keep UI consistent via shared components and tokens.
- Document every feature and update its changelog on changes.

## Repo Map
- `src/app/` - Next.js app router pages and layout.
- `src/components/ui/` - UI primitives (buttons, cards, badges).
- `src/components/design-system/` - Opus-X patterns (Panel, SectionHeader, StatusPill).
- `src/features/` - Feature modules (each feature gets its own folder).
- `src/lib/` - API clients, config, utilities.
- `docs/` - Project documentation and feature logs.

## Rules of Engagement
- Keep components small and focused; no business logic in UI primitives.
- Use the design system components for layout and status styling.
- Prefer single-responsibility files and clear naming.
- Every feature change must update its doc in `docs/features/` and add a line to `docs/CHANGELOG.md`.

## Environment
- Base API URL: `NEXT_PUBLIC_PONZINOMICS_API_URL` (see `.env.example`).
