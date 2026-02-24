use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, transfer_checked, TransferChecked}
};

use crate::{state::Auction, utils::{FundAccountArgs, NoData, fund_account}};

#[derive(Accounts)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        seeds = [b"auction", mint.key().as_ref()],
        space = Auction::DISCRIMINATOR.len() + Auction::INIT_SPACE,
        bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"vault", mint.key().as_ref()],
        space = 0,
        bump,
    )]
    /// CHECK: new account owned by the program
    pub vault: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> CreateAuction<'info> {
    pub fn create(&mut self, start_time: i64, deadline: i64, min_price: u64, min_increment: u64, bumps: &CreateAuctionBumps) -> Result<()> {
        self.auction.set_inner(Auction {
            start_time,
            deadline,
            min_price,
            current_bidder: None,
            current_bid: None,
            min_increment,
            mint: self.mint.key(),
            maker: self.user.key(),
            bump: bumps.auction,
            vault_bump: bumps.vault,
        });

        // transfer NFT from user to vault ATA
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.user_ata.to_account_info(),
            to: self.vault_ata.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer_checked(cpi_ctx, 1, 0)
    }
}
