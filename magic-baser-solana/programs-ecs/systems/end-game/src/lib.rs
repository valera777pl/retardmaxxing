use bolt_lang::*;
use game_session::GameSession;

declare_id!("9ytUaZtMR4NGUPTdJbmpbX8hhpmME8muwUGXZVSq8reY");

#[system]
pub mod end_game {
    /// End game session - simplified version that just marks session as inactive
    pub fn execute(ctx: Context<Components>, _args: Vec<u8>) -> Result<Components> {
        let session = &mut ctx.accounts.game_session;

        // Mark session as inactive (allow ending even if not active to avoid errors)
        session.is_active = false;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub game_session: GameSession,
    }
}