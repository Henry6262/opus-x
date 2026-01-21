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
- 2026-01-16: Hid the mobile metric label and set the selector chevron to brand green.
- 2026-01-16: Increased mobile summary row typography after trimming to three metrics.
- 2026-01-16: Moved the mobile metric selector into the chart header, aligned right of the version badges, and reduced its size.
- 2026-01-16: Hid the Avg Hold summary metric on mobile to free horizontal space.
- 2026-01-16: Shortened summary labels, added a Solana icon for PnL, and tightened summary precision to one decimal.
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
- 2026-01-15: Added pointer cursors to the version tabs and metric selector for clearer affordance.
- 2026-01-15: Increased the Agent Metrics header icon and text size.
- 2026-01-15: Mobile layout now hides the left rail and overlays version badges on the chart.
- 2026-01-15: Mobile analytics content now uses the full available width with tighter horizontal padding.
- 2026-01-15: Removed horizontal grid lines from the agent metrics chart.
- 2026-01-15: Mobile summary row typography tightened and padding reduced to maximize width.
- 2026-01-15: Outcome Pulse panel now renders within the Analytics tab only.
- 2026-01-15: Loading state now uses the gif as a full panel background with a dark overlay.
- 2026-01-15: Agent metrics chart now uses thicker lines with visible data point dots.
