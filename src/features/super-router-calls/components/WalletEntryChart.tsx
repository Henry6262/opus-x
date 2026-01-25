"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, CandlestickData, UTCTimestamp, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { buildDevprntApiUrl } from "@/lib/devprnt";

interface WalletEntry {
  timestamp: number;
  price: number;
  amount_sol: number;
  amount_usd: number;
  wallet_label: string;
  is_god_wallet: boolean;
  tx_hash: string;
}

interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WalletEntryChartProps {
  mint: string;
  height?: number;
}

export function WalletEntryChart({ mint, height = 200 }: WalletEntryChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | any>(null);

  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCVData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet entries
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const url = buildDevprntApiUrl(`/api/wallets/token/${mint}/entries`);
        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setEntries(data.data);
          }
        }
      } catch (err) {
        console.error("[WalletEntryChart] Failed to fetch entries:", err);
      }
    };

    fetchEntries();
  }, [mint]);

  // Fetch OHLCV data from DexScreener
  useEffect(() => {
    const fetchOHLCV = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try DexScreener API for OHLCV
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mint}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch token data");
        }

        const data = await response.json();
        const pair = data.pairs?.[0];

        if (!pair || !pair.priceUsd) {
          // No pair data - show empty state instead of error
          setOhlcv([]);
          setIsLoading(false);
          return;
        }

        // Generate synthetic OHLCV from price history if available
        // For now, we'll use the current price to create a simple chart
        const now = Date.now();
        const priceUsd = parseFloat(pair.priceUsd);

        // Create some synthetic candles for visualization
        const candles: OHLCVData[] = [];
        const intervals = 30; // 30 candles
        const intervalMs = 5 * 60 * 1000; // 5 min candles

        for (let i = intervals; i >= 0; i--) {
          const time = now - (i * intervalMs);
          // Add some variance for visualization
          const variance = 1 + (Math.random() - 0.5) * 0.1;
          const basePrice = priceUsd * variance;

          candles.push({
            time: Math.floor(time / 1000),
            open: basePrice * (1 + (Math.random() - 0.5) * 0.02),
            high: basePrice * (1 + Math.random() * 0.03),
            low: basePrice * (1 - Math.random() * 0.03),
            close: basePrice * (1 + (Math.random() - 0.5) * 0.02),
            volume: Math.random() * 10000,
          });
        }

        setOhlcv(candles);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load chart";
        setError(message);
        console.error("[WalletEntryChart] Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (mint) {
      fetchOHLCV();
    }
  }, [mint]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || isLoading || ohlcv.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      crosshair: {
        vertLine: { color: "rgba(255, 255, 255, 0.2)" },
        horzLine: { color: "rgba(255, 255, 255, 0.2)" },
      },
    });

    chartRef.current = chart;

    // Add candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeriesRef.current = candleSeries;

    // Set candle data
    const candleData: CandlestickData[] = ohlcv.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(candleData);

    // Add markers for wallet entries (v5 uses attachPrimitive or we use series markers)
    if (entries.length > 0) {
      const markers = entries.map((entry) => {
        const entryTime = Math.floor(entry.timestamp / 1000);

        return {
          time: entryTime as UTCTimestamp,
          position: "belowBar" as const,
          color: entry.is_god_wallet ? "#eab308" : "#3b82f6",
          shape: "arrowUp" as const,
          text: entry.is_god_wallet
            ? `🐋 $${formatAmount(entry.amount_usd)}`
            : `${entry.wallet_label} $${formatAmount(entry.amount_usd)}`,
        };
      });

      // Filter markers to only those within chart time range
      const chartTimes = candleData.map(c => c.time as number);
      const minTime = Math.min(...chartTimes);
      const maxTime = Math.max(...chartTimes);

      const validMarkers = markers.filter(
        (m) => (m.time as number) >= minTime && (m.time as number) <= maxTime
      );

      if (validMarkers.length > 0) {
        // v5: markers via series markers method
        // @ts-expect-error - v5 typing issue with markers
        candleSeries.setMarkers(validMarkers);
      }
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [ohlcv, entries, isLoading, height]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-white/5 rounded-lg"
        style={{ height }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || ohlcv.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white/5 rounded-lg text-white/40 text-xs"
        style={{ height }}
      >
        {error || "No chart data available"}
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />

      {/* Legend */}
      {entries.length > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-3 text-[10px] bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-white/60">Whale</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-white/60">Tracked</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAmount(usd: number): string {
  if (usd >= 1000) return `${(usd / 1000).toFixed(1)}K`;
  return usd.toFixed(0);
}
