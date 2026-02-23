use anchor_lang::prelude::*;

declare_id!("FMbPxmEm3fDtPzH8RTpqWx9xT1bd3Bio38vg7MrXr9Rv");

#[program]
pub mod graveyard_hackathon {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
