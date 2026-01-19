"use client";

import { useEffect, useState } from "react";
import { smartTradingService } from "@/features/smart-trading/service";

export default function AnalyticsDebugPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      console.log("🔍 Fetching dashboard data...");
      const result = await smartTradingService.getDashboardInit();
      console.log("✅ Data received:", result);
      setData(result);
    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <pre className="bg-red-900/20 p-4 rounded text-red-300">{error}</pre>
      </div>
    );
  }

  return (
    <div className="p-8 bg-black text-white min-h-screen font-mono text-sm">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">Analytics Debug</h1>

      {data && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-3 text-green-400">📈 Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-white/50 text-xs">Total Trades</div>
                <div className="text-2xl font-bold">{data.stats?.performance?.totalTrades || 0}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Win Rate</div>
                <div className="text-2xl font-bold text-green-400">
                  {data.stats?.performance?.winRate?.toFixed(2) || 0}%
                </div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Total P&L</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {data.stats?.performance?.netPnlSol?.toFixed(4) || 0} SOL
                </div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Open Positions</div>
                <div className="text-2xl font-bold">{data.positions?.open?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Open Positions */}
          {data.positions?.open && data.positions.open.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-3 text-green-400">🔓 Open Positions</h2>
              <div className="space-y-2">
                {data.positions.open.map((pos: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <div>
                      <div className="font-bold">{pos.tokenSymbol}</div>
                      <div className="text-xs text-white/50">Entry: {pos.entryPriceSol} SOL</div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          (pos.unrealizedPnl || 0) >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {(pos.unrealizedPnl || 0).toFixed(4)} SOL
                      </div>
                      <div className="text-xs text-white/50">
                        {(pos.unrealizedPnlPct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closed Positions */}
          {data.positions?.closed && data.positions.closed.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-3 text-amber-400">🔒 Recent Closed (last 10)</h2>
              <div className="space-y-2">
                {data.positions.closed.slice(0, 10).map((pos: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <div>
                      <div className="font-bold">{pos.tokenSymbol}</div>
                      <div className="text-xs text-white/50">
                        {new Date(pos.closedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          (pos.realizedPnlSol || 0) >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {(pos.realizedPnlSol || 0).toFixed(4)} SOL
                      </div>
                      <div className="text-xs text-white/50">
                        {(pos.realizedPnlPct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-3 text-purple-400">🔍 Raw Data</h2>
            <pre className="text-xs overflow-auto max-h-96 bg-black/50 p-4 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
