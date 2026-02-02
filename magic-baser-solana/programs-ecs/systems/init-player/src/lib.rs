use bolt_lang::*;
use player::Player;
use leaderboard::LeaderboardEntry;

declare_id!("GLR24FCjCRLcEJN37gGcZh9KBnKtM4rKRHdAFchNwprj");

#[error_code]
pub enum InitPlayerError {
    #[msg("Invalid arguments")]
    InvalidArguments,
}

/// Arguments for initializing a player
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitPlayerArgs {
    pub name: String,
}

#[system]
pub mod init_player {
    /// Initialize a new player account
    /// Creates Player component and LeaderboardEntry component for the wallet
    pub fn execute(ctx: Context<Components>, args: Vec<u8>) -> Result<Components> {
        let args: InitPlayerArgs = InitPlayerArgs::try_from_slice(&args)
            .map_err(|_| InitPlayerError::InvalidArguments)?;

        // Validate name length
        require!(args.name.len() <= 20, InitPlayerError::InvalidArguments);
        require!(!args.name.is_empty(), InitPlayerError::InvalidArguments);

        let player = &mut ctx.accounts.player;
        let leaderboard = &mut ctx.accounts.leaderboard;
        let clock = Clock::get()?;

        // Initialize Player component
        player.authority = Some(ctx.accounts.authority.key());
        player.name = args.name.clone();
        player.owned_characters = String::from("[\"imelda\"]"); // Default starter character
        player.revives = 0;
        player.total_gold = 0;
        player.games_played = 0;
        player.best_time = 0;
        player.best_wave = 0;
        player.created_at = clock.unix_timestamp;

        // Initialize LeaderboardEntry component
        leaderboard.player = Some(ctx.accounts.authority.key());
        leaderboard.name = args.name;
        leaderboard.best_time = 0;
        leaderboard.best_wave = 0;
        leaderboard.total_gold = 0;
        leaderboard.games_played = 0;
        leaderboard.updated_at = clock.unix_timestamp;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub leaderboard: LeaderboardEntry,
    }
}