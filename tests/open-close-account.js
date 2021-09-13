const anchor = require('@project-serum/anchor');
const { assert } = require('chai');

describe('open-close-account', () => {
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.OpenCloseAccount;
  const open = anchor.web3.Keypair.generate();
  const ACCOUNT_DATA_SIZE = 16;

  it('should open account and subtract lamports from wallet', async () => {
    // arrange
    const expectedLamports = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_DATA_SIZE)
    const walletLamportsBefore = (await program.provider.connection.getAccountInfo(program.provider.wallet.payer.publicKey)).lamports
    // act
    await program.rpc.initialize({
      accounts: {
        open: open.publicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [open]
    });
    // assert
    const walletLamportsAfter = (await program.provider.connection.getAccountInfo(program.provider.wallet.payer.publicKey)).lamports
    const openAccountLamports = (await program.provider.connection.getAccountInfo(open.publicKey)).lamports
    assert.ok(openAccountLamports === expectedLamports);
    assert.ok(walletLamportsBefore - walletLamportsAfter === expectedLamports);
  });

  it('should close account and send lamports back to wallet', async () => {
    // arrange
    const expectedLamports = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_DATA_SIZE)
    const walletLamportsBefore = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    // act
    await program.rpc.close({
      accounts: {
        open: open.publicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    // assert
    const walletLamportsAfter = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    assert.ok(walletLamportsAfter - walletLamportsBefore === expectedLamports);
  });
});
