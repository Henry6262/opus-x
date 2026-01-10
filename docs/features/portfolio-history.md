# Portfolio History Implementation

## Overview
We have implemented a real-time portfolio tracking system that moves away from simulated chart data to actual historical equity tracking. This allows the "VIBR WALLET" and Smart Money dashboard to display a real equity curve based on the user's trading wallet performance.

## Architecture

### 1. Database Schema (`@sypher/prisma`)
A new model `PortfolioSnapshot` was added to `schema.prisma`.
```prisma
model PortfolioSnapshot {
  id              String   @id @default(uuid())
  timestamp       DateTime @default(now())
  totalValueSol   Decimal  @map("total_value_sol") @db.Decimal(18, 9)
  walletBalanceSol Decimal @map("wallet_balance_sol") @db.Decimal(18, 9)
  unrealizedPnLSol Decimal @map("unrealized_pnl_sol") @db.Decimal(18, 9)
  openPositions   Int      @map("open_positions")

  @@index([timestamp])
  @@map("portfolio_snapshots")
}
```

### 2. Backend Service (`ponzinomics-api`)
- **Service**: `PortfolioMonitorService` (`src/modules/smart-trading/services/portfolio-monitor.service.ts`)
- **Cron Job**: Runs every minute (`@Cron(CronExpression.EVERY_MINUTE)`).
- **Logic**:
  1. Fetches current risk metrics via `RiskManagerService`.
  2. Calculates `Total Equity = Wallet Balance (Liquid) + Total Exposure (Cost Basis) + Unrealized PnL`.
  3. Saves a snapshot to the database.
- **Endpoint**: `GET /smart-trading/stats/chart`
  - Returns historical snapshots (default limit: 288 for 24h of 5m intervals, or raw data).

### 3. Frontend Integration (`SuperRouter`)
- **Hook**: `useSmartTrading` updated to fetch chart history.
- **Component**: `PortfolioWallet.tsx`
  - Replaced `generateChartData` mock with real data mapping.
  - Logic: If `chartHistory` exists, map strictly to `{ time, value }`.
  - Fallback: Uses simulation data only if no history is available (e.g., fresh install before cron runs).

## How to Test
1. **Ensure Backend is Running**: `npm run dev` in `services/ponzinomics-api`.
2. **Wait**: The Cron job runs every minute. You will see the chart start to populate with real points after a few minutes.
3. **Verify**:
   - Check `http://localhost:4001/smart-trading/stats/chart` to see raw JSON data accumulating.
   - Open SuperRouter (`http://localhost:3001` or wherever hosted) and expand the Wallet to see the "Overview" chart.

## Files Modified
- `packages/prisma/prisma/schema.prisma`
- `services/ponzinomics-api/src/modules/smart-trading/services/portfolio-monitor.service.ts`
- `services/ponzinomics-api/src/modules/smart-trading/smart-trading.controller.ts`
- `services/ponzinomics-api/src/modules/smart-trading/repositories/portfolio-snapshot.repository.ts`
- `use-case-apps/SuperRouter/src/features/smart-trading/hooks/useSmartTrading.ts`
- `use-case-apps/SuperRouter/src/features/portfolio-wallet/PortfolioWallet.tsx`
