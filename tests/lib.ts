import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { createNft as metaplexCreateNft } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, KeypairSigner, percentAmount, Signer, Umi } from "@metaplex-foundation/umi";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";

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

type AuctionConfigResult = {
  seed: anchor.BN;
  nftMint: KeypairSigner;
  auctioneerAta: anchor.web3.PublicKey;
  vaultAta: anchor.web3.PublicKey;
  auction: anchor.web3.PublicKey;
  vault: anchor.web3.PublicKey;
}

export async function setupAuction(provider: anchor.AnchorProvider, umi: Umi, program: anchor.Program<GraveyardHackathon>, auctioneer: Signer): Promise<AuctionConfigResult> {
  await airdrop_if_needed(provider, toWeb3JsPublicKey(auctioneer.publicKey), 5);

  const nftMint = await createNft(umi);
  const seed = randomBN(1000);

  const auction = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('auction'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0];

  const vaultAta = getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), auction, true);

  const auctioneerAta = getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), toWeb3JsPublicKey(auctioneer.publicKey));
  const vault = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0];
  
  return {
    seed,
    nftMint,
    auctioneerAta,
    vaultAta,
    auction,
    vault
  }
}
