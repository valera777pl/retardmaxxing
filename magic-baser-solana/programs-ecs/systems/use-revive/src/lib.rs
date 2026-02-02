use bolt_lang::*;
use player::Player;
use game_session::GameSession;

declare_id!("GwmXPNJE1MWXBgWaMyYZiemEdboAYFceanBZUkEmBA7H");

#[error_code]
pub enum UseReviveError {
    #[msg("Session not active")]
    SessionNotActive,
    #[msg("Player is not dead")]
    NotDead,
    #[msg("No revives available")]
    NoRevives,
}

#[system]
pub mod use_revive {
    /// Use a revive to continue playing after death
    /// This is an L1 transaction (costs SOL for gas)
    /// The player must have available revives
    pub fn execute(ctx: Context<Components>, _args: Vec<u8>) -> Result<Components> {
        let player = &mut ctx.accounts.player;
        let session = &mut ctx.accounts.game_session;

        // Verify session is active but player is dead
        require!(session.is_active, UseReviveError::SessionNotActive);
        require!(session.is_dead, UseReviveError::NotDead);

        // Verify player has revives available
        require!(player.revives > 0, UseReviveError::NoRevives);

        // Use one revive
        player.revives = player.revives.saturating_sub(1);

        // Restore player to alive state with 50% HP
        session.is_dead = false;
        session.hp = session.max_hp / 2;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub game_session: GameSession,
    }
}