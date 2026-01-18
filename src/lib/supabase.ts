import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create Supabase client only if credentials are provided
// Used by AI Trading Bot (pump-history) feature only
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      token_ai_analysis_log: {
        Row: {
          id: string
          token_mint: string
          token_symbol: string | null
          token_name: string | null
          trigger_type: string
          decision: string
          confidence: number
          reasoning: string
          entry_score: number | null
          reasons: string[] | null
          warnings: string[] | null
          price_usd: number | null
          market_cap: number | null
          liquidity: number | null
          volume_24h: number | null
          pump_multiple: number | null
          drawdown_percent: number | null
          resulted_in_trade: boolean | null
          position_id: string | null
          analyzed_at: string
        }
        Insert: {
          id?: string
          token_mint: string
          token_symbol?: string | null
          token_name?: string | null
          trigger_type: string
          decision: string
          confidence: number
          reasoning: string
          entry_score?: number | null
          reasons?: string[] | null
          warnings?: string[] | null
          price_usd?: number | null
          market_cap?: number | null
          liquidity?: number | null
          volume_24h?: number | null
          pump_multiple?: number | null
          drawdown_percent?: number | null
          resulted_in_trade?: boolean | null
          position_id?: string | null
          analyzed_at?: string
        }
        Update: {
          id?: string
          token_mint?: string
          token_symbol?: string | null
          token_name?: string | null
          trigger_type?: string
          decision?: string
          confidence?: number
          reasoning?: string
          entry_score?: number | null
          reasons?: string[] | null
          warnings?: string[] | null
          price_usd?: number | null
          market_cap?: number | null
          liquidity?: number | null
          volume_24h?: number | null
          pump_multiple?: number | null
          drawdown_percent?: number | null
          resulted_in_trade?: boolean | null
          position_id?: string | null
          analyzed_at?: string
        }
      }
      token_market_snapshots: {
        Row: {
          id: string
          token_mint: string
          token_symbol: string | null
          token_name: string | null
          snapshot_type: string
          price_usd: number
          market_cap: number | null
          liquidity: number | null
          volume_24h: number | null
          price_change_1h: number | null
          price_change_24h: number | null
          holder_count: number | null
          position_id: string | null
          analysis_id: string | null
          data_source: string | null
          snapshot_at: string
        }
        Insert: {
          id?: string
          token_mint: string
          token_symbol?: string | null
          token_name?: string | null
          snapshot_type: string
          price_usd: number
          market_cap?: number | null
          liquidity?: number | null
          volume_24h?: number | null
          price_change_1h?: number | null
          price_change_24h?: number | null
          holder_count?: number | null
          position_id?: string | null
          analysis_id?: string | null
          data_source?: string | null
          snapshot_at?: string
        }
        Update: {
          id?: string
          token_mint?: string
          token_symbol?: string | null
          token_name?: string | null
          snapshot_type?: string
          price_usd?: number
          market_cap?: number | null
          liquidity?: number | null
          volume_24h?: number | null
          price_change_1h?: number | null
          price_change_24h?: number | null
          holder_count?: number | null
          position_id?: string | null
          analysis_id?: string | null
          data_source?: string | null
          snapshot_at?: string
        }
      }
    }
  }
}

