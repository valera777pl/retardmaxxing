use bolt_lang::*;
use leaderboard::LeaderboardEntry;

declare_id!("6did5KX3mcbi58jUQ85ZtTV5ahCD71pfFSF96cu73g2A");

/// Args: player_pubkey(32) + best_time(4) + best_wave(1) + total_gold(8) + games_played(4) = 49 bytes minimum
#[system]
pub mod submit_score {
    /// Update leaderboard with numeric stats only (strings set via init)
    pub fn execute(ctx: Context<Components>, args: Vec<u8>) -> Result<Components> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        let clock = Clock::get()?;

        if args.len() < 49 {
            return Ok(ctx.accounts);
        }

        // Read player pubkey (32 bytes)
        let player_bytes: [u8; 32] = args[0..32].try_into().unwrap();
        leaderboard.player = Some(Pubkey::new_from_array(player_bytes));

        // Read numeric stats only
        leaderboard.best_time = u32::from_le_bytes([args[32], args[33], args[34], args[35]]);
        leaderboard.best_wave = args[36];
        leaderboard.total_gold = u64::from_le_bytes([
            args[37], args[38], args[39], args[40],
            args[41], args[42], args[43], args[44]
        ]);
        leaderboard.games_played = u32::from_le_bytes([args[45], args[46], args[47], args[48]]);
        leaderboard.updated_at = clock.unix_timestamp;

        // Note: name and character_id must be set during initialization
        // We don't modify strings here to avoid memory allocation issues

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub leaderboard: LeaderboardEntry,
    }
}
