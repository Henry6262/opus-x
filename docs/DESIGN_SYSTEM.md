# Design System

## Tokens
- Base palette lives in `src/app/globals.css` (CSS variables).
- Use `var(--accent)`, `var(--text-muted)`, and `var(--panel)` for consistent styling.

## UI Primitives (`src/components/ui`)
- `Button` - primary action buttons
- `Badge` - status indicators
- `Card` - neutral content containers

## Opus-X Patterns (`src/components/design-system`)
- `Panel` - primary surface container
- `SectionHeader` - standard header block
- `StatusPill` - compact status labels

## Usage Guidelines
- Prefer primitives and patterns over custom markup.
- Keep layout and styling consistent with the existing tokens.
- Add new reusable components to the design system and document here.
