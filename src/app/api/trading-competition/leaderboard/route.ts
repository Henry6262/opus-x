import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/trading-competition/leaderboard
 *
 * Get the top N analysts ranked by composite score.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const competitionId = searchParams.get("competition_id") ?? "season-1";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "10", 10),
      50
    );

    // Query submissions grouped by wallet, aggregating scores
    // We use a raw RPC call or a view. For now, fetch approved submissions
    // and aggregate client-side (replace with materialized view later).
    const { data: submissions, error } = await supabase
      .from("competition_submissions")
      .select(
        "wallet_address, pnl_pct, composite_score, pnl_score, analysis_score, vote_score"
      )
      .eq("competition_id", competitionId)
      .eq("status", "approved")
      .order("composite_score", { ascending: false });

    if (error) {
      console.error("Leaderboard query error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Aggregate by wallet
    const walletMap = new Map<
      string,
      {
        wallet_address: string;
        total_submissions: number;
        total_pnl: number;
        best_pnl: number;
        total_composite: number;
      }
    >();

    for (const sub of submissions ?? []) {
      const existing = walletMap.get(sub.wallet_address);
      if (existing) {
        existing.total_submissions += 1;
        existing.total_pnl += sub.pnl_pct ?? 0;
        existing.best_pnl = Math.max(
          existing.best_pnl,
          sub.pnl_pct ?? 0
        );
        existing.total_composite += sub.composite_score ?? 0;
      } else {
        walletMap.set(sub.wallet_address, {
          wallet_address: sub.wallet_address,
          total_submissions: 1,
          total_pnl: sub.pnl_pct ?? 0,
          best_pnl: sub.pnl_pct ?? 0,
          total_composite: sub.composite_score ?? 0,
        });
      }
    }

    // Sort by total composite score and take top N
    const leaderboard = Array.from(walletMap.values())
      .map((entry) => ({
        wallet_address: entry.wallet_address,
        total_submissions: entry.total_submissions,
        avg_pnl:
          entry.total_submissions > 0
            ? entry.total_pnl / entry.total_submissions
            : 0,
        best_pnl: entry.best_pnl,
        composite_score:
          entry.total_submissions > 0
            ? entry.total_composite / entry.total_submissions
            : 0,
      }))
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
