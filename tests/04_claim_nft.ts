import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, KeypairSigner, PublicKey, signerIdentity, Umi } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { airdrop_if_needed, createAuction } from './lib';
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import assert from "node:assert/strict";
import { fetchToken, findAssociatedTokenPda } from "@metaplex-foundation/mpl-toolbox";

const provider_ = anchor.AnchorProvider.env();

const provider = new anchor.AnchorProvider(
  provider_.connection,
  provider_.wallet,
  {
    commitment: 'confirmed',
  }
);

async function howManyTokensHasOwner(umi: Umi, owner: PublicKey<string>, mint: PublicKey<string>): Promise<bigint> {
  try {
    let result = findAssociatedTokenPda(umi, { owner, mint });
    associatedToken = result[0];
    let ata = await fetchToken(umi, associatedToken);
    return ata.amount;
  } catch (e) {
    return BigInt(0);
  }
}

const umi = createUmi(provider.connection);
const auctioneer = generateSigner({ eddsa: umi.eddsa });
const secretKey = auctioneer.secretKey;
const web3JsAuctioneerSigner = Keypair.fromSecretKey(secretKey);

const bidder1 = generateSigner({ eddsa: umi.eddsa });
const web3JsBidder1Signer = Keypair.fromSecretKey(bidder1.secretKey);

const somebody = generateSigner({ eddsa: umi.eddsa });
const web3JsSomebodySigner = Keypair.fromSecretKey(somebody.secretKey);

umi.use(mplTokenMetadata());
anchor.setProvider(provider);

const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

let seed: anchor.BN;
let nftMint: KeypairSigner;
let auction: anchor.web3.PublicKey;
let vault: anchor.web3.PublicKey;
let vaultAta: anchor.web3.PublicKey;
let associatedToken: PublicKey<string>;

let auctionStart: number;
let auctionEnd: number;

before(async () => {
  umi.use(signerIdentity(auctioneer));
  await airdrop_if_needed(provider, toWeb3JsPublicKey(auctioneer.publicKey), 5);
  await airdrop_if_needed(provider, toWeb3JsPublicKey(bidder1.publicKey), 5);
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("If a bid is made,", () => {
  let auctioneerTokenNumberBefore: bigint;
  let bidderTokenNumberBefore: bigint;

  before(async () => {
    const time = Math.round(new Date().getTime() / 1000);
    auctionStart = time;
    auctionEnd = time + 5;
    ({seed, nftMint, vaultAta, auction, vault} = await createAuction(auctioneer, auctionStart, auctionEnd, program, provider, umi));

    let now = new Date().getTime();
    await wait(auctionStart * 1000 - now + 1500);

    await program.methods.bid(seed, new BN(1))
      .accountsStrict({
        bidder: bidder1.publicKey,
        auction,
        vault,
        precedingBidder: null,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([web3JsBidder1Signer])
      .rpc();
  });

  describe("before the end of the auction", () => {
    it("nobody can claim the NFT", async () => {
      for (const signer of [
        web3JsAuctioneerSigner,
        web3JsBidder1Signer,
        web3JsSomebodySigner,
      ]) {
        await assert.rejects(async () => {
          await program.methods.claimNft(seed)
            .accountsStrict({
              signer: signer.publicKey,
              signerAta: getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), signer.publicKey),
              mint: nftMint.publicKey,
              auction,
              vaultAta,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([signer])
            .rpc();
        }, () => true, "Claim should fail");
      }
    });
  });

  describe("after the end of the auction,", () => {
    before(async () => {
      const now = new Date().getTime();
      await wait(auctionEnd * 1000 - now + 1500);
    });

    it("nobody can claim the NFT...", async () => {
      for (const signer of [
        web3JsAuctioneerSigner,
        web3JsSomebodySigner
      ]) {
        await assert.rejects(async () => {
          await program.methods.claimNft(seed)
            .accountsStrict({
              signer: signer.publicKey,
              signerAta: getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), signer.publicKey),
              mint: nftMint.publicKey,
              auction,
              vaultAta,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([signer])
            .rpc();
        }, () => true, "Claim should fail");
      }
    });

    it("...except the highest bidder", async () => {
      auctioneerTokenNumberBefore = await howManyTokensHasOwner(umi, auctioneer.publicKey, nftMint.publicKey);
      bidderTokenNumberBefore = await howManyTokensHasOwner(umi, bidder1.publicKey, nftMint.publicKey);
      await program.methods.claimNft(seed)
        .accountsStrict({
          signer: bidder1.publicKey,
          signerAta: getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), toWeb3JsPublicKey(bidder1.publicKey)),
          mint: nftMint.publicKey,
          auction,
          vaultAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([web3JsBidder1Signer])
        .rpc();
    });

    it("The balance of the auctioneer stays equal to 0", async () => {
      const auctioneerTokenNumberAfter = await howManyTokensHasOwner(umi, auctioneer.publicKey, nftMint.publicKey);
      assert.strictEqual(Number(auctioneerTokenNumberBefore), 0);
      assert.strictEqual(Number(auctioneerTokenNumberAfter), 0);
    });

    it("The balance of the bidder is incremented", async () => {
      const bidderTokenNumberAfter = await howManyTokensHasOwner(umi, bidder1.publicKey, nftMint.publicKey);
      assert.strictEqual(Number(bidderTokenNumberBefore), 0);
      assert.strictEqual(Number(bidderTokenNumberAfter), 1);
    });
  });
});

describe("If no bid is made", () => {
  let auctioneerTokenNumberBefore: bigint;

  before(async () => {
    const time = Math.round(new Date().getTime() / 1000);
    auctionStart = time;
    auctionEnd = time + 5;
    ({seed, nftMint, vaultAta, auction, vault} = await createAuction(auctioneer, auctionStart, auctionEnd, program, provider, umi));
    const now = new Date().getTime();
    await wait(auctionStart * 1000 - now + 1500);
  });

  describe("Before the end of the auction,", () => {
    it("nobody can claim the NFT", async () => {
      for (const signer of [
        web3JsAuctioneerSigner,
        web3JsSomebodySigner,
      ]) {
        await assert.rejects(async () => {
          await program.methods.claimNft(seed)
            .accountsStrict({
              signer: signer.publicKey,
              signerAta: getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), signer.publicKey),
              mint: nftMint.publicKey,
              auction,
              vaultAta,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([signer])
            .rpc();
        }, () => true, "Claim should fail");
      }
    });
  });

  describe("After the end of the auction,", () => {
    before(async () => {
      const now = new Date().getTime();
      await wait(auctionEnd * 1000 - now + 1500);
    });

    it("nobody can claim the NFT...", async () => {
      for (const signer of [web3JsSomebodySigner]) {
        await assert.rejects(async () => {
          await program.methods.claimNft(seed)
            .accountsStrict({
              signer: signer.publicKey,
              signerAta: getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), signer.publicKey),
              mint: nftMint.publicKey,
              auction,
              vaultAta,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([web3JsAuctioneerSigner])
            .rpc();
        }, () => true, "Claim should fail");
      }
    });

    it("...except the auctioneer", async () => {
      auctioneerTokenNumberBefore = await howManyTokensHasOwner(umi, auctioneer.publicKey, nftMint.publicKey);
      await program.methods.claimNft(seed)
        .accountsStrict({
          signer: auctioneer.publicKey,
          signerAta: getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), web3JsAuctioneerSigner.publicKey),
          mint: nftMint.publicKey,
          auction,
          vaultAta,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([web3JsAuctioneerSigner])
        .rpc();
    });

    it("The balance of the auctioneer is incremented", async () => {
      const auctioneerTokenNumberAfter = await howManyTokensHasOwner(umi, auctioneer.publicKey, nftMint.publicKey);
      assert.strictEqual(Number(auctioneerTokenNumberBefore), 0);
      assert.strictEqual(Number(auctioneerTokenNumberAfter), 1);
    });
  });
});
