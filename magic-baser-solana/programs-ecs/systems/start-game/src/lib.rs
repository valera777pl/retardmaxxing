use bolt_lang::*;
use game_session::GameSession;

declare_id!("5DeWBC5u2mWzZ46pSekwoDvknT18LKZpghY5yzT9iNR1");

/// Character stats for different playable characters
fn get_character_hp(character_id: &str) -> (u16, u16) {
    match character_id {
        "antonio" => (120, 120),
        "pasqualina" => (80, 80),
        "gennaro" => (110, 110),
        "mortaccio" => (90, 90),
        "vitalis" => (95, 95),
        _ => (100, 100), // imelda default
    }
}

#[system]
pub mod start_game {
    /// Start a new game session with selected character
    pub fn execute(ctx: Context<Components>, args: Vec<u8>) -> Result<Components> {
        let session = &mut ctx.accounts.game_session;
        let clock = Clock::get()?;

        // Parse character_id from args (simple format: 4 bytes len + string)
        let character_id = if args.len() >= 4 {
            let len = u32::from_le_bytes([args[0], args[1], args[2], args[3]]) as usize;
            if len > 0 && len < 25 && args.len() >= 4 + len {
                // Safe conversion
                let mut id = String::new();
                for &b in &args[4..4+len] {
                    if b.is_ascii_alphanumeric() {
                        id.push(b as char);
                    }
                }
                id
            } else {
                String::from("imelda")
            }
        } else {
            String::from("imelda")
        };

        let (hp, max_hp) = get_character_hp(&character_id);

        // Initialize game session
        session.character_id = character_id;
        session.hp = hp;
        session.max_hp = max_hp;
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
