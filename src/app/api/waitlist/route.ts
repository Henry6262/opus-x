import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "edge";

interface WaitlistPayload {
  email?: string;
  xHandle?: string;
  walletAddress?: string;
  interest?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSolanaAddress(address: string): boolean {
  return /^[A-Za-z0-9]{32,44}$/.test(address);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WaitlistPayload;
    const { email, xHandle, walletAddress, interest } = body;

    // Require at least one contact point
    if (!email && !xHandle && !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Please provide an email, X handle, or wallet address." },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address." },
        { status: 400 }
      );
    }

    if (walletAddress && !isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid Solana wallet address." },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      console.warn("[Waitlist] Supabase not configured; submission logged but not stored.");
      return NextResponse.json(
        {
          success: true,
          warning: "Supabase is not configured. Submission was received but not persisted.",
        },
        { status: 200 }
      );
    }

    const { error } = await supabase.from("waitlist_entries").insert({
      email: email?.toLowerCase().trim() || null,
      x_handle: xHandle?.trim() || null,
      wallet_address: walletAddress?.trim() || null,
      interest: interest?.trim() || null,
    });

    if (error) {
      console.error("[Waitlist] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to save submission. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Waitlist] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
