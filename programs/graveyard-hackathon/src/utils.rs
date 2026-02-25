use std::marker::PhantomData;

use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};

pub struct FundAccountArgs<'info> {
    pub payer: AccountInfo<'info>,
    pub account: AccountInfo<'info>,
    pub system_account: AccountInfo<'info>,
}

pub fn fund_account<'info, T> (args: FundAccountArgs<'info>) -> Result<()> where T: Space {
    let FundAccountArgs { payer, account, system_account } = args;
    let rent = Rent::get().unwrap().minimum_balance(
        if T::INIT_SPACE == 0 { 0 } else { 8 + T::INIT_SPACE }
    );
    msg!("Rent is {:?}", rent);
    let current_lamports = account.get_lamports();
    if rent > current_lamports {
        let cpi_ctx = CpiContext::new(
            system_account,
            Transfer {
                from: payer,
                to: account,
            }
        );
        transfer(cpi_ctx, rent - current_lamports)
    } else {
        Ok(())
    }
}

#[derive(InitSpace)]
pub struct NoData;
