use bolt_lang::*;

declare_id!("6URqfQrK5GTfc9HuyT43B2CLx38ZR4uu9nAhXdDmoy7M");

/// Player component - persists on L1 (main Solana chain)
/// Stores permanent player data: profile, characters, stats
#[component]
#[derive(Default)]
pub struct Player {
    /// Wallet authority for this player
    pub authority: Option<Pubkey>,
    /// Player display name (max 20 chars)
    #[max_len(20)]
    pub name: String,
    /// List of owned character IDs ["imelda", "antonio", ...]
    #[max_len(200)]
    pub owned_characters: String, // JSON array as string for simplicity
    /// Available revives (purchasable)
    pub revives: u8,
    /// Total gold earned across all games
    pub total_gold: u64,
    /// Number of games played
    pub games_played: u32,
    /// Best survival time in seconds
    pub best_time: u32,
    /// Highest wave reached
    pub best_wave: u8,
    /// Timestamp of account creation
    pub created_at: i64,
    /// Last character ID used (for leaderboard display)
    #[max_len(20)]
    pub last_character_id: String,
}