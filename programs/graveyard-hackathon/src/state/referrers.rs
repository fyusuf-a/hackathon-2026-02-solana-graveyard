use anchor_lang::prelude::*;

use crate::errors::AuctionError;

#[account]
#[derive(InitSpace)]
pub struct Referrers {
    pub referrers: [Pubkey; 40],
    pub num_referrers: u8,
    pub bump: u8,
}

impl Referrers {
    pub fn contains(&self, referrer: &AccountInfo) -> bool {
        self.referrers[..self.num_referrers as usize].contains(referrer.key)
    }

    pub fn whitelist_referrer(&mut self, account: &AccountInfo) -> Result<()> {
        require!((self.num_referrers as usize) < self.referrers.len(), AuctionError::ReferrersListFull);
        require!(!self.contains(account), AuctionError::ExistingReferrer);

        self.referrers[self.num_referrers as usize] = account.key();
        self.num_referrers += 1;
        Ok(())
    }
}
