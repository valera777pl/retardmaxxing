use bolt_lang::*;
use game_session::GameSession;
use player::Player;

declare_id!("9ytUaZtMR4NGUPTdJbmpbX8hhpmME8muwUGXZVSq8reY");

#[system]
pub mod end_game {
    /// End game session and update player stats
    pub fn execute(ctx: Context<Components>, _args: Vec<u8>) -> Result<Components> {
        let session = &mut ctx.accounts.game_session;
        let player = &mut ctx.accounts.player;

        // Update player stats from session
        // Update best wave if this run was better
        if session.wave > player.best_wave {
            player.best_wave = session.wave;
        }

        // Update best time if this run was better
        if session.time_survived > player.best_time {
            player.best_time = session.time_survived;
        }

        // Add gold earned to total
        player.total_gold = player.total_gold.saturating_add(session.gold_earned as u64);

        // Increment games played
        player.games_played = player.games_played.saturating_add(1);

        // Store character ID for leaderboard
        player.last_character_id = session.character_id.clone();

        // Mark session as inactive
        session.is_active = false;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub game_session: GameSession,
        pub player: Player,
    }
}