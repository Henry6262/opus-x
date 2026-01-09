# Project Structure

## Top-Level Layout
- `src/app/` - Next.js routes + layout
- `src/components/ui/` - UI primitives (no business logic)
- `src/components/design-system/` - Opus-X patterns and layout components
- `src/features/` - Feature modules and data hooks (one folder per feature)
- `src/lib/` - Shared utilities and API clients
- `docs/` - Documentation, feature specs, changelog

## Feature Module Convention
Each feature in `src/features/<feature-name>/` should include:
- `components/` - presentation-only components
- `hooks/` - data fetching and orchestration
- `service.ts` - API calls and business logic
- `types.ts` - feature-specific types
- `index.ts` - feature entrypoint

## Documentation Convention
Every feature must have a matching file in `docs/features/` and include:
- Purpose
- Data sources
- User flows
- UI sections
- Changelog
