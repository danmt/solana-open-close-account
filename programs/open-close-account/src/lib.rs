use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

#[program]
pub mod open_close_account {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, bump: u8) -> ProgramResult {
        msg!("Attempting to open account");
        ctx.accounts.account.authority = ctx.accounts.get_authority();
        ctx.accounts.account.bump = bump;
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> ProgramResult {
        msg!("Attempting to close account");
        if ctx.accounts.validate_authority() {
            return Err(ErrorCode::Unauthorized.into());
        }
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        // Anchor account discriminator + publicKey size
        space = 8 + 32 + 1,
        // This account is a PDA
        seeds = [authority.key.as_ref()],
        bump = bump
    )]
    pub account: ProgramAccount<'info, OpenAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    /*
        By using the close constraint, anchor automatically closes
        the account and returns the lamports back to the target,
        in this case the target is the authority account.
    */
    #[account(mut, close = authority)]
    pub account: ProgramAccount<'info, OpenAccount>,
    /*
        The signer constraint ensures the authority signed the
        transaction.
    */
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[account]
pub struct OpenAccount {
    authority: Pubkey,
    bump: u8,
}

impl<'info> Initialize<'info> {
    fn get_authority(&self) -> Pubkey {
        *self.authority.to_account_info().key
    }
}

impl<'info> Close<'info> {
    fn validate_authority(&self) -> bool {
        self.account.authority != *self.authority.key
    }
}

#[error]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
