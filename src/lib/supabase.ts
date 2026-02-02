import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Lazy initialization to avoid build-time errors when env vars are not set
let _supabase: SupabaseClient | null = null;

/**
 * Returns true if Supabase is configured (env vars are set).
 * Use this to guard optional Supabase features.
 */
export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabase(): SupabaseClient | null {
    if (!_supabase) {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn(
                "[Supabase] Environment variables not set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Supabase features disabled."
            );
            return null;
        }
        _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabase;
}

// For backward compatibility - returns a proxy that logs warnings instead of crashing
// when Supabase is not configured
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        const client = getSupabase();
        if (!client) {
            // Return a no-op function for method calls, undefined for properties
            // This prevents the page from crashing when Supabase is optional
            return typeof prop === "string"
                ? (..._args: unknown[]) => {
                      console.warn(`[Supabase] Called .${prop}() but Supabase is not configured. Skipping.`);
                      return Promise.resolve({ data: null, error: { message: "Supabase not configured" } });
                  }
                : undefined;
        }
        return Reflect.get(client, prop);
    },
});
