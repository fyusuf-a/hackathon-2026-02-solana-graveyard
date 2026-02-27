use anchor_lang::prelude::*;

declare_id!("FMbPxmEm3fDtPzH8RTpqWx9xT1bd3Bio38vg7MrXr9Rv");

mod instructions;
mod state;
mod utils;
mod errors;

use instructions::*;
use state::*;

#[program]
pub mod graveyard_hackathon {
    use crate::state::ReferralStructure;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn create_auction(ctx: Context<CreateAuction>, seed: u64, start_time: i64, deadline: i64, min_price: u64, min_increment: u64, referral_structure: Option<ReferralStructure>) -> Result<()> {
        ctx.accounts.create(seed, start_time, deadline, min_price, min_increment, referral_structure, &ctx.bumps)
    }

    pub fn bid(ctx: Context<Bid>, seed: u64, lamports: u64) -> Result<()> {
        ctx.accounts.bid(seed, lamports)
    }

    pub fn claim_nft(ctx: Context<ClaimNFT>, seed: u64) -> Result<()> {
        ctx.accounts.claim_nft(seed)
    }

    pub fn claim_payment(ctx: Context<ClaimPayment>, seed: u64) -> Result<()> {
        ctx.accounts.claim_payment(seed)
    }

    pub fn whitelist_referrer(ctx: Context<WhitelistReferrer>, _seed: u64) -> Result<()> {
        ctx.accounts.whitelist_referrer()
    }
}
