use anchor_lang::prelude::*;

#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ReferralStructure {
    pub base_fee_bps: u16,
    pub buyer_discount_bps: u16,
}

#[account]
#[derive(InitSpace)]
pub struct Auction {
    pub start_time: i64,
    pub deadline: i64,
    pub min_price: u64,
    pub current_bidder: Option<Pubkey>,
    pub current_bid: Option<u64>,
    pub min_increment: u64,
    pub mint: Pubkey,
    pub maker: Pubkey,
    pub referral_structure: Option<ReferralStructure>,
    pub bump: u8,
    pub vault_bump: u8,
}
