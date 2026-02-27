use crate::{
    errors::AuctionError,
    state::{Auction, Referrers},
};
use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

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

    #[account(
        seeds = [b"whitelist", seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub referrer_whitelist: Option<Account<'info, Referrers>>,

    #[account(mut)]
    pub referrer: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

struct DistributionScheme {
    pub to_vault: u64,
    pub to_referrer: u64,
}

impl<'info> Bid<'info> {
    pub fn bid(&mut self, seed: u64, lamports: u64) -> Result<()> {
        // check that the bid occurs between auction start and end date
        let current_time = Clock::get()?.unix_timestamp;
        let time_elapsed = current_time - self.auction.start_time;
        require!(time_elapsed >= 0, AuctionError::AuctionNotStarted);
        require!(
            current_time < self.auction.deadline,
            AuctionError::AuctionEnded
        );

        // check auction amount
        match self.auction.current_bid {
            Some(current_bid) => {
                if self.auction.min_increment == 0 {
                    require!(lamports > current_bid, AuctionError::BidTooLow);
                } else {
                    require!(
                        lamports >= current_bid + self.auction.min_increment,
                        AuctionError::BidTooLow
                    );
                }
            }
            None => {
                require!(lamports >= self.auction.min_price, AuctionError::BidTooLow);
            }
        };

        // refund preceding bidder
        require!(
            self.auction.current_bidder == self.preceding_bidder.clone().map(|x| x.key()),
            AuctionError::BadPrecedingBidder
        );
        if self.preceding_bidder.is_some() {
            self.refund(seed)?;
        }

        let is_referred = if self.referrer.is_some() && self.referrer_whitelist.is_some() {
            let referrer = self.referrer.as_ref().unwrap();
            let list = self.referrer_whitelist.as_ref().unwrap();
            list.contains(referrer)
        } else {
            false
        };

        let DistributionScheme {
            to_vault,
            to_referrer,
        } = self.compute_distribution(lamports, is_referred);

        // transfer payment to the required parties
        self.fund(to_vault, self.vault.to_account_info())?;
        if is_referred {
            self.fund(to_referrer, self.referrer.clone().unwrap())?;
        }

        self.auction.current_bid = Some(lamports);
        self.auction.current_bidder = Some(*self.bidder.key);
        Ok(())
    }

    fn compute_distribution(&mut self, lamports: u64, is_referred: bool) -> DistributionScheme {
        if self.auction.referral_structure.is_some() && is_referred {
            let structure = self.auction.referral_structure.as_ref().unwrap();
            let fee = lamports
                .checked_mul(structure.base_fee_bps as u64)
                .unwrap_or(0)
                .checked_div(10_000)
                .unwrap_or(0);
            let discount = lamports
                .checked_mul(structure.buyer_discount_bps as u64)
                .unwrap_or(0)
                .checked_div(10_000)
                .unwrap_or(0);

            DistributionScheme {
                to_vault: lamports - fee,
                to_referrer: fee - discount,
            }
        } else {
            DistributionScheme {
                to_vault: lamports,
                to_referrer: 0,
            }
        }
    }

    fn fund(&mut self, lamports: u64, account: AccountInfo<'info>) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            self.system_program.to_account_info(),
            Transfer {
                from: self.bidder.to_account_info(),
                to: account,
            },
        );
        transfer(cpi_ctx, lamports)
    }

    fn refund(&mut self, seed: u64) -> Result<()> {
        let seed_bytes = seed.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", seed_bytes.as_ref(), &[self.auction.vault_bump]]];
        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            Transfer {
                from: self.vault.to_account_info(),
                to: self.preceding_bidder.clone().unwrap(),
            },
            signer_seeds,
        );
        let rent = Rent::get().unwrap().minimum_balance(0);
        let balance = self.vault.lamports();
        transfer(cpi_ctx, (balance - rent).max(0))
    }
}
