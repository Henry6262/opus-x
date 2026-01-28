import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/trading-competition/submissions/[id]/vote
 *
 * Vote on a competition submission. One vote per wallet per submission.
 *
 * Body: { voter_wallet: string, direction: 1 | -1 }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const body = await request.json();
    const { voter_wallet, direction } = body;

    if (!voter_wallet || (direction !== 1 && direction !== -1)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "voter_wallet (string) and direction (1 or -1) are required",
        },
        { status: 400 }
      );
    }

    // Verify submission exists
    const { data: submission, error: subError } = await supabase
      .from("competition_submissions")
      .select("id")
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // Upsert vote (one vote per wallet per submission)
    const { data: vote, error: voteError } = await supabase
      .from("competition_votes")
      .upsert(
        {
          submission_id: submissionId,
          voter_wallet,
          direction,
        },
        {
          onConflict: "submission_id,voter_wallet",
        }
      )
      .select()
      .single();

    if (voteError) {
      console.error("Vote upsert error:", voteError);
      return NextResponse.json(
        { success: false, error: voteError.message },
        { status: 500 }
      );
    }

    // Recalculate vote_score for the submission
    const { data: votes, error: countError } = await supabase
      .from("competition_votes")
      .select("direction")
      .eq("submission_id", submissionId);

    if (!countError && votes) {
      const voteScore = votes.reduce(
        (sum: number, v: { direction: number }) => sum + v.direction,
        0
      );

      await supabase
        .from("competition_submissions")
        .update({ vote_score: voteScore })
        .eq("id", submissionId);
    }

    return NextResponse.json({ success: true, data: vote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
