use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};

pub struct FundAccountArgs<'info, T> where T: Space {
    pub payer: AccountInfo<'info>,
    pub account: AccountInfo<'info>,
    pub system_account: AccountInfo<'info>,
    pub data: T,
}

pub fn fund_account<'info, T> (args: FundAccountArgs<'info, T>) -> Result<()> where T: Space {
    let FundAccountArgs { payer, account, system_account, data: _ } = args;
    let rent = Rent::get().unwrap().minimum_balance(
        if T::INIT_SPACE == 0 { 0 } else { 8 + T::INIT_SPACE }
    );
    if rent < account.get_lamports() {
        let cpi_ctx = CpiContext::new(
            system_account,
            Transfer {
                from: payer,
                to: account,
            }
        );
        transfer(cpi_ctx, rent)
    } else {
        Ok(())
    }
}

#[derive(InitSpace)]
pub struct NoData;
