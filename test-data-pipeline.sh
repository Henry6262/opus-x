#!/bin/bash

# SuperRouter Data Pipeline Verification
# Tests that frontend can receive real data from devprnt backend

API_URL="https://devprint-production.up.railway.app"

echo "=========================================="
echo "SuperRouter Data Pipeline Check"
echo "=========================================="
echo ""

echo "1️⃣  Testing Trading Config Endpoint"
echo "   GET $API_URL/api/trading/config"
echo ""
curl -s "$API_URL/api/trading/config" | jq '{
  success: .success,
  wallet_address: .data.wallet_address,
  sol_balance: .data.sol_balance,
  trading_mode: .data.trading_mode,
  enabled: .data.enabled,
  auto_buy: .data.auto_buy,
  buy_amount_sol: .data.buy_amount_sol
}'
echo ""
echo ""

echo "2️⃣  Testing Trading Stats Endpoint"
echo "   GET $API_URL/api/trading/stats"
echo ""
curl -s "$API_URL/api/trading/stats" | jq '{
  success: .success,
  open_positions: .data.open_positions,
  closed_positions: .data.closed_positions,
  total_pnl: .data.total_pnl,
  win_rate: .data.win_rate,
  winning_trades: .data.winning_trades,
  losing_trades: .data.losing_trades
}'
echo ""
echo ""

echo "3️⃣  Testing Positions Endpoint"
echo "   GET $API_URL/api/trading/positions"
echo ""
POSITIONS=$(curl -s "$API_URL/api/trading/positions")
POS_COUNT=$(echo "$POSITIONS" | jq '.data | length')
echo "   Found $POS_COUNT positions"
echo "$POSITIONS" | jq '{
  success: .success,
  position_count: (.data | length),
  first_position: .data[0] | {
    ticker: .token_symbol,
    status: .status,
    entry_sol: .entry_amount_sol,
    unrealized_pnl: .unrealized_pnl
  }
}'
echo ""
echo ""

echo "4️⃣  Testing Tokens/Migrations Endpoint"
echo "   GET $API_URL/api/tokens?limit=5"
echo ""
TOKENS=$(curl -s "$API_URL/api/tokens?limit=5&order=desc")
TOKEN_COUNT=$(echo "$TOKENS" | jq '.data | length')
echo "   Found $TOKEN_COUNT recent migrations"
echo "$TOKENS" | jq '{
  success: .success,
  count: .count,
  latest_tokens: .data[0:3] | map({
    symbol: .symbol,
    name: .name,
    detected_at: .detected_at,
    platform: .platform
  })
}'
echo ""
echo ""

echo "5️⃣  Testing WebSocket Endpoint"
echo "   WS $API_URL/trading"
echo ""
echo "   ⚠️ WebSocket test requires manual verification"
echo "   Check browser console for 'Connected to trading WebSocket' message"
echo ""
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "✅ If all endpoints returned 'success: true', the data pipeline is ready!"
echo ""
echo "📊 Frontend Data Flow:"
echo "   1. On load: GET /api/trading/config (wallet balance, settings)"
echo "   2. On load: GET /api/trading/stats (P&L, win rate)"
echo "   3. On load: GET /api/trading/positions (open/closed positions)"
echo "   4. On load: GET /api/tokens (recent migrations)"
echo "   5. Real-time: WebSocket /trading (live updates)"
echo ""
echo "🚀 When transactions start:"
echo "   - Positions will appear in /api/trading/positions"
echo "   - Stats will update in /api/trading/stats"
echo "   - Wallet balance will decrease in /api/trading/config"
echo "   - Frontend will display all data automatically!"
echo ""
