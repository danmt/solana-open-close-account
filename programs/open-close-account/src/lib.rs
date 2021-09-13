use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

#[program]
pub mod open_close_account {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        msg!("Attempting to open account");
        ctx.accounts.account.data = 0;
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> ProgramResult {
        msg!("Attempting to close account");
        // get the current lamports in the account
        let account_lamports = ctx.accounts.account.to_account_info().lamports();
        // extract all the lamports from the created account
        **ctx
            .accounts
            .account
            .to_account_info()
            .try_borrow_mut_lamports()? = 0;
        // add all the account lamports to the authority account
        **ctx
            .accounts
            .authority
            .to_account_info()
            .try_borrow_mut_lamports()? += account_lamports;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8
    )]
    pub account: ProgramAccount<'info, OpenAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub account: ProgramAccount<'info, OpenAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[account]
pub struct OpenAccount {
    data: u8,
}
