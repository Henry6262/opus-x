# Target Cursor

## Purpose
Provide a desktop-only cursor overlay that highlights interactive elements with a lock-on effect.

## Data Sources
- None. This is a client-only visual enhancement.

## User Flows
- Desktop users move the pointer and see the custom cursor follow the mouse.
- Hovering interactive elements snaps the cursor corners to the target bounds.

## UI Sections
- Global overlay mounted in `src/app/[locale]/layout.tsx`.
- Target elements are defined by the selector in `src/components/target-cursor/TargetCursor.tsx`.

## Changelog
- 2026-01-16: Added the GSAP-driven target cursor overlay for desktop hover targets.
- 2026-01-16: Added cursor targeting to smart trading watchlist cards and transaction rows.
- 2026-01-16: Disabled the target cursor overlay so the default cursor shows again.
