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
- 2026-01-16: Removed the stat card label hover animation to keep the text steady.
- 2026-01-16: Version chips now use a brighter glow and stronger border when active.
- 2026-01-16: Tooltip now omits avg multiplier and uses the short version code in the header.
- 2026-01-16: Agent metrics chart tooltip now shows per-date PnL, win rate, trades, multiplier, and hold time on a dark panel.
- 2026-01-16: Agent metrics chart now filters to the selected version data only.
- 2026-01-16: Chart now remounts on version changes and uses per-version line colors with stronger selected emphasis.
- 2026-01-16: Reduced stat card corner radius and added a green increase state during count-up animations.
- 2026-01-16: Moved the desktop metric selector into the chart header at the top-right edge.
- 2026-01-16: Shifted the stat column to 28% width, increased chart height, and added left/bottom chart borders.
- 2026-01-16: Removed stat card borders and shifted the chart to two-thirds width so the stat column has more space.
- 2026-01-16: Tightened stat card padding and gaps while increasing chart height.
- 2026-01-16: Stacked stat cards vertically and tightened padding with smaller values.
- 2026-01-16: Tightened stat card height, reduced glow overflow, and scaled down value text.
- 2026-01-16: Summary labels now use brighter gray and heavier weight.
- 2026-01-16: Summary column now shows label + value on one line with larger typography.
- 2026-01-16: Stacked the summary metrics to the right of the chart on desktop, giving them a quarter of the width.
- 2026-01-16: Increased desktop summary values and version chip sizing for better readability.
- 2026-01-16: Removed the desktop versions sidebar and moved version chips into the chart header with a transparent style; chart now spans full width with a shorter desktop height.
- 2026-01-16: Removed the chart container border, increased chart height, and boosted line dots for denser readability.
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
- 2026-01-15: Agent metrics chart line thickness increased again and X-axis preserves the first/last date labels.
- 2026-01-15: Agent metrics chart uses lighter brand green lines to keep dots prominent.
- 2026-01-15: Mobile summary stats now render two per row instead of a single column.
- 2026-01-15: Metric selector now sits on the Agent Metrics title row instead of overlaying the chart.
- 2026-01-16: Chart comparison loading now uses a spinner instead of the gif background.
- 2026-01-16: Timeframe selector now defaults to 3-hour and places it first in the toggle.
- 2026-01-16: Avg Hold stat now includes a tooltip explaining partial exits.
- 2026-01-16: Added more spacing between the timeframe and metric selectors in the header.
