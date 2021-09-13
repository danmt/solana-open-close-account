use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

#[program]
pub mod open_close_account {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        msg!("Attempting to open account");
        ctx.accounts.open.data = 0;
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> ProgramResult {
        msg!("Attempting to close account");
        let open_account_lamports = ctx.accounts.open.to_account_info().lamports();
        **ctx
            .accounts
            .open
            .to_account_info()
            .try_borrow_mut_lamports()? -= open_account_lamports;
        **ctx
            .accounts
            .authority
            .to_account_info()
            .try_borrow_mut_lamports()? += open_account_lamports;
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
    pub open: ProgramAccount<'info, OpenAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub open: ProgramAccount<'info, OpenAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[account]
pub struct OpenAccount {
    data: u8,
}
