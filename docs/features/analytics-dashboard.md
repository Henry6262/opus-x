# Feature: Analytics Dashboard

## Purpose
Provide version-level analytics and comparisons for agent performance over time, including win rate, PnL, and trade volume summaries.

## Data Sources
- Devprint versioning API (`/api/versions`, `/api/versions/:id/metrics`)

## UI Sections
- Version list sidebar with active status
- Summary metrics cards
- Performance comparison charts

## Changelog
- 2026-01-15: Stabilized version comparison loading to prevent repeated re-fetch loops when version IDs remain unchanged.
- 2026-01-15: Compressed the versions rail to show only version names and give the main analytics content more width.
- 2026-01-15: Removed the redundant top-level stat cards so the detailed section below is the primary summary.
- 2026-01-15: Restored readable version names in the sidebar and shifted the chart to a cleaner line chart with chart-config labels.
- 2026-01-15: Normalized versioning API responses from snake_case to camelCase so version names and metrics render correctly.
- 2026-01-15: Swapped the metric pills for a single metric selector and moved the chart header outside the chart container.
- 2026-01-15: Version tabs now emphasize V1/V2 codes and inactive versions render in light grey, with chart lines matching that active/inactive palette.
- 2026-01-15: Renamed the performance header to Agent Metrics and stacked the metric label above the selector.
- 2026-01-15: Replaced the flat divider with a soft gradient separator on the versions rail.
- 2026-01-15: Added a compact 4-across summary row under Agent Metrics using the selected version summary.
- 2026-01-15: Tightened summary formatting (centered values, rounded percentages, two-decimal SOL) and renamed Total Trades to Trades.
- 2026-01-15: Removed the header description and replaced metric cards with a divider-separated row.
- 2026-01-15: Swapped in short vertical separators and added a soft horizontal separator above the summary row.
- 2026-01-15: Reduced the agent metrics chart height for a tighter layout.
- 2026-01-15: Replaced the chart loading spinner with the `gif.gif` asset at a larger size.
- 2026-01-15: Reduced chart height further and removed the version details card under the chart.
