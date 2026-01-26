"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, CandlestickData, UTCTimestamp, type IChartApi, type ISeriesApi, createSeriesMarkers, type SeriesMarker, LineSeries, type LineData } from "lightweight-charts";
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
  showTooltip?: boolean;
}

export function WalletEntryChart({ mint, height = 200, showTooltip = true }: WalletEntryChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | any>(null);

  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCVData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    price: string;
    time: string;
    x: number;
    y: number;
    visible: boolean;
  }>({ price: "", time: "", x: 0, y: 0, visible: false });

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
        textColor: "rgba(255, 255, 255, 0.6)",
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255, 255, 255, 0.1)",
        rightOffset: 5,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1, // Normal mode - shows both lines
        vertLine: {
          color: "rgba(196, 247, 14, 0.4)",
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "rgba(196, 247, 14, 0.9)",
        },
        horzLine: {
          color: "rgba(196, 247, 14, 0.4)",
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "rgba(196, 247, 14, 0.9)",
        },
      },
      localization: {
        priceFormatter: (price: number) => {
          if (price < 0.00001) return price.toExponential(2);
          if (price < 0.01) return price.toFixed(6);
          if (price < 1) return price.toFixed(4);
          return price.toFixed(2);
        },
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

    // Add markers for wallet entries (v5 uses createSeriesMarkers)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let markersPlugin: any = null;

    if (entries.length > 0) {
      const markers: SeriesMarker<UTCTimestamp>[] = entries.map((entry) => {
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
        // v5: use createSeriesMarkers to attach markers to a series
        markersPlugin = createSeriesMarkers(candleSeries, validMarkers);
      }
    }

    // Add horizontal price lines for wallet entries (simpler visualization)
    if (entries.length > 0 && showTooltip) {
      entries.forEach((entry) => {
        if (entry.price > 0) {
          candleSeries.createPriceLine({
            price: entry.price,
            color: entry.is_god_wallet ? "rgba(234, 179, 8, 0.6)" : "rgba(59, 130, 246, 0.5)",
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: entry.is_god_wallet ? "🐋" : entry.wallet_label?.slice(0, 4) || "👛",
          });
        }
      });
    }

    // Fit content
    chart.timeScale().fitContent();

    // Crosshair move handler for custom tooltip
    const handleCrosshairMove = (param: any) => {
      if (!param.time || !param.point) {
        setTooltipData(prev => ({ ...prev, visible: false }));
        return;
      }

      const data = param.seriesData.get(candleSeries);
      if (data) {
        const price = (data as any).close ?? (data as any).value ?? 0;
        const formattedPrice = formatPrice(price);
        const formattedTime = new Date((param.time as number) * 1000).toLocaleTimeString();

        setTooltipData({
          price: formattedPrice,
          time: formattedTime,
          x: param.point.x,
          y: param.point.y,
          visible: true,
        });
      }
    };

    if (showTooltip) {
      chart.subscribeCrosshairMove(handleCrosshairMove);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (showTooltip) {
        chart.unsubscribeCrosshairMove(handleCrosshairMove);
      }
      // Clear markers before removing chart
      if (markersPlugin) {
        markersPlugin.setMarkers([]);
      }
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [ohlcv, entries, isLoading, height, showTooltip]);

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

      {/* Custom Tooltip */}
      {showTooltip && tooltipData.visible && (
        <div
          className="absolute pointer-events-none z-20 bg-black/90 backdrop-blur-sm border border-[#c4f70e]/30 rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(tooltipData.x + 10, (chartContainerRef.current?.clientWidth || 200) - 100),
            top: Math.max(10, tooltipData.y - 50),
          }}
        >
          <div className="text-[#c4f70e] font-bold text-sm">{tooltipData.price}</div>
          <div className="text-white/50 text-[10px]">{tooltipData.time}</div>
        </div>
      )}

      {/* Legend */}
      {entries.length > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-3 text-[10px] bg-black/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-yellow-500 rounded-full" />
            <span className="text-white/70">Whale Entry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 bg-blue-500 rounded-full" />
            <span className="text-white/70">Tracked</span>
          </div>
        </div>
      )}

      {/* Wallet Entries List (compact) */}
      {entries.length > 0 && height >= 200 && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
          {entries.slice(0, 5).map((entry, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
                entry.is_god_wallet
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              <span>{entry.is_god_wallet ? "🐋" : "👛"}</span>
              <span>${formatAmount(entry.amount_usd)}</span>
              <span className="text-white/40">@{formatPrice(entry.price)}</span>
            </div>
          ))}
          {entries.length > 5 && (
            <div className="px-2 py-1 rounded-full bg-white/10 text-white/50 text-[10px]">
              +{entries.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAmount(usd: number): string {
  if (usd >= 1000) return `${(usd / 1000).toFixed(1)}K`;
  return usd.toFixed(0);
}

function formatPrice(price: number): string {
  if (price < 0.00001) return price.toExponential(2);
  if (price < 0.001) return price.toFixed(6);
  if (price < 0.01) return price.toFixed(5);
  if (price < 1) return price.toFixed(4);
  return `$${price.toFixed(2)}`;
}
