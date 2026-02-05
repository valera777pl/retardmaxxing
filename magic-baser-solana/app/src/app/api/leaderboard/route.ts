import { NextRequest, NextResponse } from 'next/server';
import { supabase, LeaderboardRow } from '@/lib/supabase';

// GET - Fetch top 10 leaderboard entries
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('best_wave', { ascending: false })
      .order('best_time', { ascending: false })
      .order('total_gold', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[Leaderboard API] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data || [] });
  } catch (err) {
    console.error('[Leaderboard API] GET exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// POST - Submit/update a player's score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      name,
      bestWave,
      bestTime,
      totalGold,
      gamesPlayed,
      characterId,
    } = body;

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    // Check if player already exists to compare best scores
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('best_wave, best_time')
      .eq('wallet_address', walletAddress)
      .single();

    // Calculate final best scores (keep the higher values)
    const finalBestWave = Math.max(bestWave || 0, existing?.best_wave || 0);
    const finalBestTime = Math.max(bestTime || 0, existing?.best_time || 0);

    // Upsert (insert or update on conflict)
    const { error } = await supabase
      .from('leaderboard')
      .upsert(
        {
          wallet_address: walletAddress,
          name: name || 'Anonymous',
          best_wave: finalBestWave,
          best_time: finalBestTime,
          total_gold: Number(totalGold) || 0,
          games_played: gamesPlayed || 1,
          character_id: characterId || 'imelda',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );

    if (error) {
      console.error('[Leaderboard API] POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Leaderboard API] POST exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit score' },
      { status: 500 }
    );
  }
}
