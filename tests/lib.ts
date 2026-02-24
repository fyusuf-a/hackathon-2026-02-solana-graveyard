import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { createNft as metaplexCreateNft } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";

export const ONE_SECOND = 1000;

export function randomBN(max: number, rng = Math.random) {
  return new anchor.BN(Math.floor(rng() * max));
}

export async function airdrop_if_needed(provider: AnchorProvider, publicKey: anchor.web3.PublicKey, amount: number) {
  const balance = await provider.connection.getBalance(publicKey);
  if (balance === 0) {
    const signature = await provider.connection.requestAirdrop(publicKey, amount * anchor.web3.LAMPORTS_PER_SOL);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    }, "confirmed")
  }
}

export async function createNft(umi) {
  try {
    const nftMint = generateSigner(umi);
    await metaplexCreateNft(umi, {
      mint: nftMint,
      name: "GM",
      symbol: "GM",
      uri: "https://arweave.net/123",
      sellerFeeBasisPoints: percentAmount(5.5),
    }).sendAndConfirm(umi);

    return nftMint;
  } catch (error) {
    console.log(error);
    throw error;
  }
}


export const admin = anchor.web3.Keypair.generate();
