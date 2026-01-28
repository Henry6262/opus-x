import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/trading-competition/submissions
 *
 * Create a new competition submission.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      wallet_address,
      traded_wallet_address,
      token_mint,
      token_data,
      trade_data,
      twitter_data,
      analysis,
    } = body;

    if (!wallet_address || !traded_wallet_address || !token_mint) {
      return NextResponse.json(
        {
          success: false,
          error:
            "wallet_address, traded_wallet_address, and token_mint are required",
        },
        { status: 400 }
      );
    }

    // Calculate PnL from trade data
    const pnlPct = trade_data?.pnl_pct ?? 0;
    const pnlUsd = trade_data?.pnl_usd ?? 0;

    // Normalize PnL score (0-100 scale, capped at 1000% PnL)
    const pnlScore = Math.min(100, Math.max(0, (pnlPct / 1000) * 100));

    // Analysis score based on how much the user wrote (simple heuristic)
    const analysisText = [
      analysis?.why_bought ?? "",
      analysis?.indicators_used ?? "",
      analysis?.exit_reasoning ?? "",
    ].join(" ");
    const wordCount = analysisText.trim().split(/\s+/).filter(Boolean).length;
    const analysisScore = Math.min(100, wordCount * 2);

    const { data, error } = await supabase
      .from("competition_submissions")
      .insert({
        wallet_address,
        traded_wallet_address,
        token_mint,
        token_symbol: token_data?.symbol ?? null,
        token_name: token_data?.name ?? null,
        token_image_url: token_data?.image_url ?? null,
        market_cap_at_entry: trade_data?.trades?.[0]
          ? null
          : null,
        price_at_entry: trade_data?.avg_entry_price ?? null,
        current_price: token_data?.price_usd ?? null,
        current_market_cap: token_data?.market_cap ?? null,
        liquidity: token_data?.liquidity ?? null,
        volume_24h: token_data?.volume_24h ?? null,
        pnl_pct: pnlPct,
        pnl_usd: pnlUsd,
        entry_time: trade_data?.first_buy_at
          ? new Date(trade_data.first_buy_at).toISOString()
          : null,
        exit_time: null,
        twitter_data: twitter_data ?? null,
        trade_data: trade_data ?? null,
        why_bought: analysis?.why_bought ?? null,
        indicators_used: analysis?.indicators_used ?? null,
        exit_reasoning: analysis?.exit_reasoning ?? null,
        pnl_score: pnlScore,
        analysis_score: analysisScore,
        vote_score: 0,
        competition_id: "season-1",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trading-competition/submissions
 *
 * List competition submissions with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const competitionId = searchParams.get("competition_id") ?? "season-1";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10),
      100
    );
    const offset = (page - 1) * limit;

    let query = supabase
      .from("competition_submissions")
      .select("*", { count: "exact" })
      .eq("competition_id", competitionId)
      .order("composite_score", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
