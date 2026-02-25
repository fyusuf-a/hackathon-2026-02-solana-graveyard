use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use crate::{errors::AuctionError, state::Auction};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Bid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", seed.to_le_bytes().as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"vault", seed.to_le_bytes().as_ref()],
        bump = auction.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The account of the preceding bidder. A check is made to ensure its public key is the right
    /// one.
    #[account(mut)]
    pub preceding_bidder: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

impl<'info> Bid<'info> {
    pub fn bid(&mut self, seed: u64, lamports: u64) -> Result<()> {
        // check that the bid occurs between auction start and end date
        let current_time = Clock::get()?.unix_timestamp;
        let time_elapsed = current_time - self.auction.start_time;
        require!(time_elapsed >= 0, AuctionError::AuctionNotStarted);
        require!(current_time < self.auction.deadline, AuctionError::AuctionEnded);

        // check auction amount
        let minimum = match self.auction.current_bid {
            Some(current_bid) => current_bid + self.auction.min_increment,
            None => self.auction.min_price,
        };
        require!(lamports > minimum, AuctionError::BidTooLow);

        // if there is a preceding bidder, refund them
        require!(self.auction.current_bidder == self.preceding_bidder.clone().map(|x| x.key()), AuctionError::BadPrecedingBidder);
        if self.auction.current_bidder.is_some() {
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
                    to: self.preceding_bidder.clone().unwrap(),
                },
                signer_seeds,
            );
            let current_bid = self.auction.current_bid.unwrap();
            transfer(cpi_ctx, current_bid)?;
        }

        let cpi_ctx = CpiContext::new(
            self.system_program.to_account_info(),
            Transfer {
                from: self.bidder.to_account_info(),
                to: self.vault.to_account_info(),
            },
        );
        transfer(cpi_ctx, lamports)?;
        self.auction.current_bid = Some(lamports);
        self.auction.current_bidder = Some(*self.bidder.key);
        Ok(())
    }
}
