use anchor_lang::prelude::*;

use crate::{state::{Auction, Referrers}};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct WhitelistReferrer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        has_one = maker,
        seeds = [b"auction", seed.to_le_bytes().as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init_if_needed,
        payer = maker,
        space = Referrers::DISCRIMINATOR.len() + Referrers::INIT_SPACE,
        seeds = [b"whitelist", seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub referrer_whitelist: Account<'info, Referrers>,

    pub referrer: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> WhitelistReferrer<'info> {
    pub fn whitelist_referrer(&mut self) -> Result<()> {
        self.referrer_whitelist.whitelist_referrer(&self.referrer.to_account_info())
    }
}
