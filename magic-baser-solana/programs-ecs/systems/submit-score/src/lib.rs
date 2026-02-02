use bolt_lang::*;
use player::Player;
use leaderboard::LeaderboardEntry;

declare_id!("6did5KX3mcbi58jUQ85ZtTV5ahCD71pfFSF96cu73g2A");

#[error_code]
pub enum SubmitScoreError {
    #[msg("Invalid authority")]
    InvalidAuthority,
}

#[system]
pub mod submit_score {
    /// Sync player stats to leaderboard entry
    /// Can be called to update leaderboard without ending a game
    /// Useful for recovery or manual sync
    pub fn execute(ctx: Context<Components>, _args: Vec<u8>) -> Result<Components> {
        let player = &ctx.accounts.player;
        let leaderboard = &mut ctx.accounts.leaderboard;
        let clock = Clock::get()?;

        // Verify player has authority
        require!(
            player.authority.is_some(),
            SubmitScoreError::InvalidAuthority
        );

        // Sync player stats to leaderboard
        leaderboard.player = player.authority;
        leaderboard.name = player.name.clone();
        leaderboard.best_time = player.best_time;
        leaderboard.best_wave = player.best_wave;
        leaderboard.total_gold = player.total_gold;
        leaderboard.games_played = player.games_played;
        leaderboard.updated_at = clock.unix_timestamp;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub leaderboard: LeaderboardEntry,
    }
}