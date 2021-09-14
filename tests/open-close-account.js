const anchor = require('@project-serum/anchor');
const { assert } = require('chai');
const idl = require('../target/idl/open_close_account.json');

describe('open-close-account', () => {
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.OpenCloseAccount;
  const ACCOUNT_DATA_SIZE = 41;

  it('should open account and subtract lamports from wallet', async () => {
    // arrange
    const beforeLamports = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    const [accountPublicKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [program.provider.wallet.publicKey.toBuffer()],
      program.programId
    );
    // act
    const signature = await program.rpc.initialize(bump, {
      accounts: {
        account: accountPublicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    await program.provider.connection.confirmTransaction(signature);
    // assert
    const rentExemption = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_DATA_SIZE)
    const { feeCalculator } = await program.provider.connection.getRecentBlockhash('finalized');
    const openAccount = await program.account.openAccount.fetch(accountPublicKey);
    const afterLamports = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports;
    assert.equal(beforeLamports, afterLamports + rentExemption + (feeCalculator.lamportsPerSignature * 1));
    assert.ok(program.provider.wallet.publicKey.equals(openAccount.authority));
  });

  it('should close account and send lamports back to wallet', async () => {
    // arrange
    const beforeLamports = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    const [accountPublicKey] = await anchor.web3.PublicKey.findProgramAddress(
      [program.provider.wallet.publicKey.toBuffer()],
      program.programId
    );
    // act
    const signature = await program.rpc.close({
      accounts: {
        account: accountPublicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    await program.provider.connection.confirmTransaction(signature);
    // assert
    const rentExemption = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_DATA_SIZE)
    const { feeCalculator } = await program.provider.connection.getRecentBlockhash('finalized');
    const afterLamports = (await program.provider.connection.getAccountInfo(program.provider.wallet.publicKey)).lamports
    assert.equal(beforeLamports + rentExemption + (feeCalculator.lamportsPerSignature * 1), afterLamports);
  });

  it('should fail when signer is not the authority', async () => {
    // arrange
    const [accountPublicKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [program.provider.wallet.publicKey.toBuffer()],
      program.programId
    );
    // Set up a new program instance with a newly generated wallet
    // and airdrop 1 SOL to it.
    const newProvider = new anchor.Provider(program.provider.connection, new anchor.Wallet(anchor.web3.Keypair.generate()), {});
    const newProgram = new anchor.Program(idl, program.programId, newProvider);
    const airdropSignature = await newProgram.provider.connection.requestAirdrop(newProgram.provider.wallet.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    await newProgram.provider.connection.confirmTransaction(airdropSignature);
    // Open an account using the local wallet
    const initializeSignature = await program.rpc.initialize(bump, {
      accounts: {
        account: accountPublicKey,
        authority: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    await program.provider.connection.confirmTransaction(initializeSignature);
    const expectedErrorMsg = 'You are not authorized to perform this action.'
    let errorMsg = '';
    // act
    try {
      // Attempt to close the account with the new wallet
      await newProgram.rpc.close({
        accounts: {
          account: accountPublicKey,
          authority: newProgram.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
    } catch (error) {
      errorMsg = error.toString();
    }
    // assert
    assert.equal(errorMsg, expectedErrorMsg)
  });
});
