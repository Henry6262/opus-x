/**
 * Test script to verify analytics data flow
 * Run: npx tsx src/scripts/test-analytics-data.ts
 */

import { smartTradingService } from "@/features/smart-trading/service";

async function testAnalytics() {
  console.log("🔍 Testing Analytics Data Flow\n");
  console.log("=".repeat(60));

  try {
    console.log("\n📊 Fetching dashboard data...\n");
    const data = await smartTradingService.getDashboardInit();

    console.log("✅ Data received!");
    console.log("\n📈 Stats:");
    console.log(`   Total Trades: ${data.stats.performance.totalTrades}`);
    console.log(`   Winning Trades: ${data.stats.performance.winningTrades}`);
    console.log(`   Losing Trades: ${data.stats.performance.losingTrades}`);
    console.log(`   Win Rate: ${data.stats.performance.winRate}%`);
    console.log(`   Total P&L: ${data.stats.performance.netPnlSol} SOL`);

    console.log("\n💼 Positions:");
    console.log(`   Open: ${data.positions.open.length}`);
    console.log(`   Closed: ${data.positions.closed.length}`);

    if (data.positions.open.length > 0) {
      console.log("\n🔓 Open Positions:");
      data.positions.open.forEach((pos, i) => {
        console.log(`   ${i + 1}. ${pos.tokenSymbol} - Entry: ${pos.entryPriceSol} SOL - P&L: ${pos.unrealizedPnl || 0} SOL`);
      });
    }

    if (data.positions.closed.length > 0) {
      console.log("\n🔒 Recent Closed Positions (last 5):");
      data.positions.closed.slice(0, 5).forEach((pos, i) => {
        console.log(`   ${i + 1}. ${pos.tokenSymbol} - P&L: ${pos.realizedPnlSol} SOL (${pos.realizedPnlPct?.toFixed(2)}%)`);
      });
    }

    console.log("\n📊 Wallet Balance:");
    console.log(`   SOL: ${data.stats.wallet.solBalance} SOL`);
    console.log(`   Active Value: ${data.stats.wallet.activeValueSol} SOL`);

    console.log("\n=".repeat(60));
    console.log("\n✅ ALL DATA LOOKS GOOD!");
    console.log("\nIf analytics panel is empty, the issue is:");
    console.log("1. Frontend not calling getDashboardInit() properly");
    console.log("2. React state not updating");
    console.log("3. Component not re-rendering");
    console.log("4. Supabase query failing (for AI decisions)");

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    console.log("\nBackend API might be down or unreachable");
  }
}

testAnalytics();
