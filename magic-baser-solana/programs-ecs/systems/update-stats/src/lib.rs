use bolt_lang::*;
use game_session::GameSession;

declare_id!("7FeyB4hz8LCrBYJusgEzKReT9rbgkrqdbB2L6aoMPv88");

#[error_code]
pub enum UpdateStatsError {
    #[msg("Invalid arguments")]
    InvalidArguments,
    #[msg("Session not active")]
    SessionNotActive,
}

/// Arguments for updating game stats (called from ER every 200ms)
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateStatsArgs {
    pub hp: u16,
    pub xp: u32,
    pub gold_earned: u32,
    pub time_survived: u32,
    pub wave: u8,
    pub kills: u32,
    pub level: u8,
    pub is_dead: bool,
}

#[system]
pub mod update_stats {
    /// Update game session stats
    /// This is called frequently from ER (every 200ms) during gameplay
    /// Updates are gasless when running in Ephemeral Rollup
    pub fn execute(ctx: Context<Components>, args: Vec<u8>) -> Result<Components> {
        let args: UpdateStatsArgs = UpdateStatsArgs::try_from_slice(&args)
            .map_err(|_| UpdateStatsError::InvalidArguments)?;

        let session = &mut ctx.accounts.game_session;

        // Verify session is active
        require!(session.is_active, UpdateStatsError::SessionNotActive);

        // Update session stats
        session.hp = args.hp;
        session.xp = args.xp;
        session.gold_earned = args.gold_earned;
        session.time_survived = args.time_survived;
        session.wave = args.wave;
        session.kills = args.kills;
        session.is_dead = args.is_dead;

        // Handle level up (XP thresholds: 100, 250, 500, 1000, etc.)
        let new_level = calculate_level(args.xp);
        if new_level > session.level {
            session.level = new_level;
            // Increase max HP on level up
            session.max_hp = session.max_hp.saturating_add(10);
        }

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub game_session: GameSession,
    }
}

/// Calculate level from XP using exponential curve
fn calculate_level(xp: u32) -> u8 {
    if xp < 100 { 1 }
    else if xp < 250 { 2 }
    else if xp < 500 { 3 }
    else if xp < 1000 { 4 }
    else if xp < 2000 { 5 }
    else if xp < 4000 { 6 }
    else if xp < 8000 { 7 }
    else if xp < 16000 { 8 }
    else if xp < 32000 { 9 }
    else { 10 }
}