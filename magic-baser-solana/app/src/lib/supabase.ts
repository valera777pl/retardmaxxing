import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (for API routes only)
// Uses service_role key which bypasses RLS
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Type for leaderboard table rows
export interface LeaderboardRow {
  id: number;
  wallet_address: string;
  name: string;
  best_wave: number;
  best_time: number;
  total_gold: number;
  games_played: number;
  character_id: string;
  updated_at: string;
}
