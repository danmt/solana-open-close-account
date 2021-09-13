const anchor = require('@project-serum/anchor');
const { assert } = require('chai');
const idl = require('../target/idl/open_close_account.json');

describe('open-close-account', () => {
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.OpenCloseAccount;
  const account = anchor.web3.Keypair.generate();
  const ACCOUNT_DATA_SIZE = 40;

  it('should open account and subtract lamports from wallet', async () => {
    // arrange
    const expectedLamports = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_DATA_SIZE)
    const walletLamportsBefore = (await program.provider.connection.getAccountInfo(program.provider.wallet.payer.publicKey)).lamports
    // act
    await program.rpc.initialize({
      accounts: {
        account: account.publicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [account]
    });
    // assert
    const walletLamportsAfter = (await program.provider.connection.getAccountInfo(program.provider.wallet.payer.publicKey)).lamports
    assert.ok(walletLamportsBefore - walletLamportsAfter === expectedLamports);
  });

  it('should close account and send lamports back to wallet', async () => {
    // arrange
    const expectedLamports = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_DATA_SIZE)
    const walletLamportsBefore = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    // act
    await program.rpc.close({
      accounts: {
        account: account.publicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    // assert
    const walletLamportsAfter = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    assert.ok(walletLamportsAfter - walletLamportsBefore === expectedLamports);
  });

  it('should fail when signer is not the authority', async () => {
    // arrange
    const newAccount = anchor.web3.Keypair.generate();
    // Set up a new program instance with a newly generated wallet
    // and airdrop 1 SOL to it.
    const newProvider = new anchor.Provider(program.provider.connection, new anchor.Wallet(anchor.web3.Keypair.generate()), {});
    const newProgram = new anchor.Program(idl, program.programId, newProvider);
    const signature = await newProgram.provider.connection.requestAirdrop(newProgram.provider.wallet.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    await newProgram.provider.connection.confirmTransaction(signature);
    // Open an account using the local wallet
    await program.rpc.initialize({
      accounts: {
        account: newAccount.publicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [newAccount]
    });
    const expectedErrorMsg = 'You are not authorized to perform this action.'
    let errorMsg = '';
    // act
    try {
      // Attempt to close the account with the new wallet
      await newProgram.rpc.close({
        accounts: {
          account: newAccount.publicKey,
          authority: newProgram.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
    } catch (error) {
      errorMsg = error.toString();
    }
    // assert
    assert.ok(errorMsg === expectedErrorMsg)
  });
});
