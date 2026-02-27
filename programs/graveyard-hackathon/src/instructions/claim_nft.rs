use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::errors::AuctionError;
use crate::state::Auction;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct ClaimNFT<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
    )]
    pub signer_ata: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [b"auction", seed.to_le_bytes().as_ref()],
        has_one = mint,
        bump = auction.bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> ClaimNFT<'info> {
    pub fn claim_nft(&mut self, seed: u64) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time >= self.auction.deadline,
            AuctionError::AuctionNotEnded
        );

        match self.auction.current_bidder {
            Some(bidder) => {
                require!(
                    self.signer.to_account_info().key() == bidder,
                    AuctionError::BadAccount,
                );
            }
            None => {
                require!(
                    self.signer.to_account_info().key() == self.auction.maker,
                    AuctionError::BadAccount,
                );
            }
        }

        let seed_bytes = seed.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[b"auction", seed_bytes.as_ref(), &[self.auction.bump]]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            TransferChecked {
                mint: self.mint.to_account_info(),
                from: self.vault_ata.to_account_info(),
                to: self.signer_ata.to_account_info(),
                authority: self.auction.to_account_info(),
            },
            signer_seeds,
        );
        transfer_checked(cpi_ctx, 1, 0)
    }
}
