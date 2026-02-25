use anchor_lang::prelude::*;

declare_id!("FMbPxmEm3fDtPzH8RTpqWx9xT1bd3Bio38vg7MrXr9Rv");

mod instructions;
mod state;
mod utils;
mod errors;

use instructions::*;

#[program]
pub mod graveyard_hackathon {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn create_auction(ctx: Context<CreateAuction>, seed: u64, start_time: i64, deadline: i64, min_price: u64, min_increment: u64) -> Result<()> {
        ctx.accounts.create(seed, start_time, deadline, min_price, min_increment, &ctx.bumps)
    }

    pub fn bid(ctx: Context<Bid>, seed: u64, lamports: u64) -> Result<()> {
        ctx.accounts.bid(seed, lamports)
    }
}
