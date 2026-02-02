use bolt_lang::*;

declare_id!("9zbUFw8u3XzzNRA3TDQsGG2AkEuu2AQBXFYPxAZuWhTo");

/// GameSession component - delegated to Ephemeral Rollup (ER)
/// Stores real-time game state with 10-50ms latency updates
/// This account gets delegated to ER at game start, then committed back to L1
#[component]
#[derive(Default)]
pub struct GameSession {
    /// Reference to Player entity (owner of this session)
    pub player: Option<Pubkey>,
    /// Selected character ID for this session
    #[max_len(20)]
    pub character_id: String,
    /// Current health points
    pub hp: u16,
    /// Maximum health points
    pub max_hp: u16,
    /// Current level
    pub level: u8,
    /// Current experience points
    pub xp: u32,
    /// Gold earned in this session
    pub gold_earned: u32,
    /// Time survived in seconds
    pub time_survived: u32,
    /// Current wave number
    pub wave: u8,
    /// Is game currently active
    pub is_active: bool,
    /// Is player dead (can still revive)
    pub is_dead: bool,
    /// Unix timestamp when game started
    pub started_at: i64,
    /// Number of kills in this session
    pub kills: u32,
}