# 🔗 Blockchain Validation for Position Tracking

## Overview

This feature implements **Birdeye-based blockchain validation** for position tracking in the Portfolio Wallet. Instead of relying solely on database records, positions are now validated against actual on-chain holdings.

**Problem Solved:** Portfolio was showing positions that no longer existed on-chain (sold tokens, transferred assets, etc.), causing misinformation about actual holdings.

**Solution:** Use Birdeye's wallet token list API as the source of truth for blockchain state.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Portfolio Wallet UI                       │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │  Database Positions │    │  Birdeye On-Chain Holdings  │ │
│  │  (what we tracked)  │    │  (what blockchain says)     │ │
│  └──────────┬──────────┘    └──────────────┬──────────────┘ │
│             │                              │                 │
│             └──────────┬───────────────────┘                 │
│                        │                                     │
│                        ▼                                     │
│              ┌─────────────────┐                             │
│              │  RECONCILIATION │                             │
│              │                 │                             │
│              │ Only show if:   │                             │
│              │ - On-chain > 0  │                             │
│              │ - Use Birdeye   │                             │
│              │   quantity      │                             │
│              └─────────────────┘                             │
│                        │                                     │
│                        ▼                                     │
│              ┌─────────────────┐                             │
│              │ Validated UI    │                             │
│              │ Positions       │                             │
│              └─────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Created/Modified

### ✅ NEW: API Endpoint

**File:** `/src/app/api/birdeye/wallet-holdings/route.ts`

Server-side proxy for Birdeye wallet token list API. Keeps `BIRDEYE_API_KEY` secure on the server.

**Endpoint:** `GET /api/birdeye/wallet-holdings?wallet=<address>`

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": "FXP5NMdr...",
    "totalUsd": 41.48,
    "holdings": [
      {
        "address": "7nsmpDhP...",
        "symbol": "flow",
        "name": "FLOW STATE",
        "decimals": 6,
        "balance": 22073552906,
        "uiAmount": 22073.552906,
        "priceUsd": 0.000196,
        "valueUsd": 4.34,
        "icon": "https://..."
      }
    ],
    "holdingsMap": { ... },
    "tokenCount": 23
  },
  "fetchedAt": 1768498005018
}
```

**Features:**
- Filters out dust balances (< $0.01)
- Provides `holdingsMap` for O(1) lookup by mint address
- 30-second cache via Next.js `revalidate`

---

### ✅ NEW: React Hook

**File:** `/src/features/smart-trading/hooks/useBirdeyeWalletHoldings.ts`

Custom hook for fetching and validating wallet holdings.

**Usage:**
```typescript
import { useBirdeyeWalletHoldings } from "@/features/smart-trading";

const {
  data,              // Full wallet data
  holdingsMap,       // Map<mint, holding> for quick lookup
  isLoading,         // Loading state
  error,             // Error if any
  lastUpdated,       // Timestamp of last successful fetch
  refresh,           // Manual refresh function
  validatePosition,  // Validate single position
  validatePositions, // Batch validation
  hasHolding,        // Check if mint exists on-chain
  getHolding,        // Get holding by mint
} = useBirdeyeWalletHoldings({
  walletAddress: "FXP5NMdr...",
  refreshIntervalMs: 30000,  // Auto-refresh every 30s (default)
  autoRefresh: true,         // Enable auto-refresh (default)
});
```

**Validation Example:**
```typescript
// Check if position exists on-chain
if (hasHolding(tokenMint)) {
  const holding = getHolding(tokenMint);
  console.log(`On-chain balance: ${holding.uiAmount}`);
}

// Validate with quantity check
const result = validatePosition(tokenMint, expectedQuantity, symbol);
// result = {
//   mint: "...",
//   symbol: "flow",
//   expectedQuantity: 22000,
//   actualQuantity: 22073.55,
//   isValid: true,
//   quantityDiff: 73.55,
//   mismatchPercent: 0.33
// }
```

---

### ✅ MODIFIED: Portfolio Wallet

**File:** `/src/features/portfolio-wallet/PortfolioWallet.tsx`

**Changes:**
1. Replaced Helius-based reconciliation with Birdeye hook
2. Positions are filtered to only show those with on-chain balance
3. Uses actual blockchain quantity instead of database estimates
4. Adds `isValidated` and `birdeyeValueUsd` fields to positions

**Key Code:**
```typescript
// Get wallet address from config
const walletAddress = config?.wallet_address || null;

// On-chain holdings via Birdeye (TRUE source of truth)
const {
  holdingsMap: birdeyeHoldings,
  isLoading: isLoadingHoldings,
  hasHolding,
  getHolding
} = useBirdeyeWalletHoldings({
  walletAddress,
  refreshIntervalMs: 30000,
  autoRefresh: true,
});

// Filter positions - only show if on-chain balance exists
const uiPositions = useMemo(() => {
  return positions
    .filter(p => {
      if (birdeyeHoldings.size === 0 && isLoadingHoldings) return true;
      return hasHolding(p.tokenMint);  // ✅ Only if on-chain
    })
    .map(p => {
      const birdeyeHolding = getHolding(p.tokenMint);
      const quantity = birdeyeHolding?.uiAmount ?? p.remainingTokens;
      return {
        ...position,
        isValidated: birdeyeHolding !== undefined,
        birdeyeValueUsd: birdeyeHolding?.valueUsd ?? null
      };
    });
}, [positions, birdeyeHoldings, isLoadingHoldings]);
```

---

### ✅ MODIFIED: Position Types

**File:** `/src/features/portfolio-wallet/types.ts`

Added validation fields:
```typescript
export interface Position {
  // ... existing fields ...

  /** Whether position is validated against Birdeye on-chain data */
  isValidated?: boolean;

  /** USD value from Birdeye (blockchain validated) */
  birdeyeValueUsd?: number | null;
}
```

---

### ✅ MODIFIED: Exports

**File:** `/src/features/smart-trading/index.ts`

Added new exports:
```typescript
export { useBirdeyeWalletHoldings } from "./hooks/useBirdeyeWalletHoldings";
export { useBirdeyePolling } from "./hooks/useBirdeyePolling";
```

---

## How It Works

### 1. Data Flow

```
User opens Portfolio Wallet
         │
         ▼
┌─────────────────────────────┐
│ useBirdeyeWalletHoldings()  │
│ fetches on-chain holdings   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ GET /api/birdeye/wallet-    │
│ holdings?wallet=...         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Birdeye API                 │
│ /v1/wallet/token_list       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Returns holdings + prices   │
│ Creates holdingsMap         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Portfolio filters positions │
│ by hasHolding(mint)         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ UI shows only validated     │
│ positions with real data    │
└─────────────────────────────┘
```

### 2. Auto-Refresh Cycle

- Hook polls Birdeye every **30 seconds**
- API endpoint caches responses for **30 seconds**
- Positions automatically update when holdings change

### 3. Validation Logic

A position is considered **valid** if:
- On-chain balance exists (`uiAmount > 0`)
- Quantity mismatch is less than 10% (allows for rounding)

---

## Environment Variables

Ensure `BIRDEYE_API_KEY` is set in your environment:

```env
BIRDEYE_API_KEY=your_birdeye_api_key_here
```

The key is kept server-side and never exposed to the client.

---

## Testing

### Manual Test

```bash
# Test the API endpoint directly
curl "http://localhost:3000/api/birdeye/wallet-holdings?wallet=YOUR_WALLET_ADDRESS" | jq
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "wallet": "...",
    "totalUsd": 41.48,
    "holdings": [...],
    "holdingsMap": {...},
    "tokenCount": 23
  },
  "fetchedAt": 1768498005018
}
```

---

## Benefits

| Before | After |
|--------|-------|
| ❌ Showed sold positions | ✅ Only shows actual holdings |
| ❌ Database quantity (stale) | ✅ Blockchain quantity (real-time) |
| ❌ No validation | ✅ Birdeye-validated positions |
| ❌ Potential misinformation | ✅ Accurate portfolio state |

---

## Limitations

1. **Rate Limits:** Birdeye API has rate limits. The 30-second refresh interval and caching help avoid hitting limits.

2. **Dust Filtering:** Holdings worth less than $0.01 are filtered out. This prevents showing micro-dust from failed swaps.

3. **Network Delays:** On-chain data may have slight delays (seconds) compared to real-time transaction state.

---

## Related Files

- **API Route:** `/src/app/api/birdeye/wallet-holdings/route.ts`
- **Hook:** `/src/features/smart-trading/hooks/useBirdeyeWalletHoldings.ts`
- **Portfolio:** `/src/features/portfolio-wallet/PortfolioWallet.tsx`
- **Types:** `/src/features/portfolio-wallet/types.ts`

---

## Commit

```
feat(birdeye): add blockchain validation for position tracking

- Add /api/birdeye/wallet-holdings endpoint for on-chain data
- Create useBirdeyeWalletHoldings hook with validation functions
- Integrate Birdeye validation into PortfolioWallet
- Filter positions to only show those with on-chain balance
- Use blockchain quantity as source of truth
```

**Commit Hash:** `36c90f1`

---

*Last Updated: January 2026*
