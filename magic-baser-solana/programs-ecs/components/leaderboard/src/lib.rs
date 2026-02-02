use bolt_lang::*;

declare_id!("DsGfKAe1dC62tx3AkwAad2RsvYqNFF69ki73KdemF53P");

/// LeaderboardEntry component - persists on L1
/// Stores individual player's best scores for leaderboard display
#[component]
#[derive(Default)]
pub struct LeaderboardEntry {
    /// Reference to Player entity
    pub player: Option<Pubkey>,
    /// Player display name (cached for fast display)
    #[max_len(20)]
    pub name: String,
    /// Best survival time in seconds
    pub best_time: u32,
    /// Highest wave reached
    pub best_wave: u8,
    /// Total gold accumulated
    pub total_gold: u64,
    /// Total games played
    pub games_played: u32,
    /// Last update timestamp
    pub updated_at: i64,
}