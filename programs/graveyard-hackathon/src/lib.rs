use anchor_lang::prelude::*;

declare_id!("FMbPxmEm3fDtPzH8RTpqWx9xT1bd3Bio38vg7MrXr9Rv");

mod instructions;
mod state;

use instructions::*;

#[program]
pub mod graveyard_hackathon {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }
}
