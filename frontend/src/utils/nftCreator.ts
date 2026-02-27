import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const LOCALNET_ENDPOINT = "http://localhost:8899";

export async function createTestNft(
  walletPublicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = new Connection(LOCALNET_ENDPOINT);

  // Airdrop SOL if needed
  const balance = await connection.getBalance(walletPublicKey);
  if (balance < 1 * anchor.web3.LAMPORTS_PER_SOL) {
    const airdropSig = await connection.requestAirdrop(
      walletPublicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig, "confirmed");
  }

  // Generate a new mint keypair
  const mint = anchor.web3.Keypair.generate();
  const mintPubkey = mint.publicKey;

  // Get minimum balance for minting
  const mintRent = await connection.getMinimumBalanceForRentExemption(82);

  // Get associated token account
  const userAta = getAssociatedTokenAddressSync(
    mintPubkey,
    walletPublicKey,
    true
  );

  // Build the transaction
  const transaction = new Transaction();

  // Create mint account (need to add +82 bytes for mint data)
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: walletPublicKey,
      newAccountPubkey: mintPubkey,
      space: 82,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintPubkey,
      0,
      walletPublicKey,
      walletPublicKey,
      TOKEN_PROGRAM_ID
    )
  );

  // Create associated token account
  transaction.add(
    createAssociatedTokenAccountInstruction(
      walletPublicKey,
      userAta,
      walletPublicKey,
      mintPubkey
    )
  );

  // Mint 2 tokens to the user (so they have > 1)
  transaction.add(
    createMintToInstruction(mintPubkey, userAta, walletPublicKey, 2)
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPublicKey;

  // Sign with both the wallet and the mint keypair
  transaction.partialSign(mint);

  // Sign with wallet
  const signedTx = await signTransaction(transaction);

  // Send transaction
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return mintPubkey.toString();
}
