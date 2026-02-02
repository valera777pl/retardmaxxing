use bolt_lang::prelude::*;

declare_id!("PMCNPTdTaQi8zSayLLAth3Y1wSG3EpGqSRYJNZiSpax");

#[program]
pub mod magic_baser_solana {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
