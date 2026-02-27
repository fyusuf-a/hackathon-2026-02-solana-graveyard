"use client";
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
} from "@solana/spl-token";

const LOCALNET_ENDPOINT = "http://localhost:8899";

/*
function utf8StringToBytes(str: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(str));
}
*/

/*
function createMetadataInstruction(
  metadataProgramId: PublicKey,
  metadata: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  name: string,
  symbol: string,
  uri: string
): TransactionInstruction {
  const keys = [
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: false },
    { pubkey: updateAuthority, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const data = Buffer.alloc(1000);
  let offset = 0;

  data.writeUInt8(0, offset);
  offset += 1;

  const nameBytes = utf8StringToBytes(name);
  data.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  data.set(nameBytes, offset);
  offset += nameBytes.length;

  const symbolBytes = utf8StringToBytes(symbol);
  data.writeUInt32LE(symbolBytes.length, offset);
  offset += 4;
  data.set(symbolBytes, offset);
  offset += symbolBytes.length;

  const uriBytes = utf8StringToBytes(uri);
  data.writeUInt32LE(uriBytes.length, offset);
  offset += 4;
  data.set(uriBytes, offset);
  offset += uriBytes.length;

  data.writeUInt8(0, offset);
  offset += 1;

  data.writeUInt16LE(0, offset);

  return new TransactionInstruction({
    keys,
    programId: metadataProgramId,
    data: data.slice(0, offset + 2),
  });
}
*/

export async function createTestNft(
  metadataProgramId: PublicKey,
  walletPublicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = new Connection(LOCALNET_ENDPOINT);

  const balance = await connection.getBalance(walletPublicKey);
  if (balance < 1 * anchor.web3.LAMPORTS_PER_SOL) {
    const airdropSig = await connection.requestAirdrop(
      walletPublicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig, "confirmed");
  }

  const mint = anchor.web3.Keypair.generate();
  const mintPubkey = mint.publicKey;

  const mintRent = await connection.getMinimumBalanceForRentExemption(82);

  const userAta = getAssociatedTokenAddressSync(
    mintPubkey,
    walletPublicKey,
    true
  );

  /*
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      metadataProgramId.toBuffer(),
      mintPubkey.toBuffer(),
    ],
    metadataProgramId
  );

  const metadataRent = await connection.getMinimumBalanceForRentExemption(0);
  */

  const transaction = new Transaction();

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

  /*
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: walletPublicKey,
      newAccountPubkey: metadataAddress,
      space: 1000,
      lamports: metadataRent,
      programId: metadataProgramId,
    })
  );

  const randomSeed = Math.floor(Math.random() * 1000000);
  const nftName = `Test NFT ${randomSeed}`;
  const nftSymbol = "TNFT";
  const nftUri = `https://picsum.photos/seed/${randomSeed}/200/300`;

  transaction.add(
    createMetadataInstruction(
      metadataProgramId,
      metadataAddress,
      mintPubkey,
      walletPublicKey,
      walletPublicKey,
      walletPublicKey,
      nftName,
      nftSymbol,
      nftUri
    )
  );
  */

  transaction.add(
    createAssociatedTokenAccountInstruction(
      walletPublicKey,
      userAta,
      walletPublicKey,
      mintPubkey
    )
  );

  transaction.add(
    createMintToInstruction(mintPubkey, userAta, walletPublicKey, 2)
  );

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPublicKey;

  transaction.partialSign(mint);

  try {
    const signedTx = await signTransaction(transaction);

    // Verify wallet signed
    const walletSigned = signedTx.signatures.some(
      (sig) =>
        sig.publicKey.toBase58() === walletPublicKey.toBase58() &&
        sig.signature !== null
    );
    if (!walletSigned) {
      throw new Error("Wallet did not sign the transaction");
    }

    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, "confirmed");
  } catch (err) {
    console.error("Transaction signing failed:", err);
    throw err;
  }

  return mintPubkey.toString();
}
