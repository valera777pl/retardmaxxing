use bolt_lang::*;
use player::Player;
use game_session::GameSession;

declare_id!("5DeWBC5u2mWzZ46pSekwoDvknT18LKZpghY5yzT9iNR1");

#[error_code]
pub enum StartGameError {
    #[msg("Invalid arguments")]
    InvalidArguments,
    #[msg("Invalid authority")]
    InvalidAuthority,
}

/// Arguments for starting a game
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct StartGameArgs {
    pub character_id: String,
}

/// Character stats for different playable characters
struct CharacterStats {
    hp: u16,
    max_hp: u16,
}

fn get_character_stats(character_id: &str) -> Option<CharacterStats> {
    match character_id {
        "imelda" => Some(CharacterStats { hp: 100, max_hp: 100 }),
        "antonio" => Some(CharacterStats { hp: 120, max_hp: 120 }),
        "pasqualina" => Some(CharacterStats { hp: 80, max_hp: 80 }),
        "gennaro" => Some(CharacterStats { hp: 110, max_hp: 110 }),
        "mortaccio" => Some(CharacterStats { hp: 90, max_hp: 90 }),
        _ => None,
    }
}

#[system]
pub mod start_game {
    /// Start a new game session - simplified version without string checks
    pub fn execute(ctx: Context<Components>, _args: Vec<u8>) -> Result<Components> {
        let session = &mut ctx.accounts.game_session;
        let clock = Clock::get()?;

        // Initialize game session with default character stats
        session.hp = 100;
        session.max_hp = 100;
        session.level = 1;
        session.xp = 0;
        session.gold_earned = 0;
        session.time_survived = 0;
        session.wave = 1;
        session.is_active = true;
        session.is_dead = false;
        session.started_at = clock.unix_timestamp;
        session.kills = 0;

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub game_session: GameSession,
    }
}