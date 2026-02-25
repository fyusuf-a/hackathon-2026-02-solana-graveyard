use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};
use anchor_spl::token::Mint;

use crate::state::Auction;
use crate::errors::AuctionError;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct ClaimPayment<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    pub mint: Account<'info, Mint>,

    #[account(
        seeds = [b"auction", seed.to_le_bytes().as_ref()],
        has_one = mint,
        has_one = maker,
        bump = auction.bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"vault", seed.to_le_bytes().as_ref()],
        bump = auction.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> ClaimPayment<'info> {
    pub fn claim_payment(&mut self, seed: u64) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= self.auction.deadline, AuctionError::AuctionNotEnded);

        let current_bid = self.auction.current_bid.unwrap_or(0);
        if current_bid != 0 {
            let seed_bytes = seed.to_le_bytes();
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"vault",
                seed_bytes.as_ref(),
                &[self.auction.vault_bump],
            ]];
            let cpi_ctx = CpiContext::new_with_signer(
                self.system_program.to_account_info(),
                Transfer {
                    from: self.vault.to_account_info(),
                    to: self.maker.to_account_info(),
                },
                signer_seeds
            );
            transfer(cpi_ctx, current_bid)
        } else {
            Ok(())
        }
    }
}
