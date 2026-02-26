import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, KeypairSigner, signerIdentity, SolAmount } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { airdrop_if_needed, createAuction } from './lib';
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import assert from "node:assert/strict";
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";

const provider_ = anchor.AnchorProvider.env();

const provider = new anchor.AnchorProvider(
  provider_.connection,
  provider_.wallet,
  {
    commitment: 'confirmed',
  }
);

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

let auctionStart: number;
let auctionEnd: number;

let balanceBefore: SolAmount;

before(async () => {
  umi.use(signerIdentity(auctioneer));
  await airdrop_if_needed(provider, toWeb3JsPublicKey(auctioneer.publicKey), 5);
  await airdrop_if_needed(provider, toWeb3JsPublicKey(bidder1.publicKey), 5);
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("If a bid is made,", () => {
  before(async () => {
    const time = Math.round(new Date().getTime() / 1000);
    auctionStart = time;
    auctionEnd = time + 5;
    ({seed, nftMint, auction, vault} = await createAuction(auctioneer, auctionStart, auctionEnd, program, provider, umi));

    let now = new Date().getTime();
    await wait(auctionStart * 1000 - now + 1500);

    await program.methods.bid(seed, new BN(1))
      .accountsStrict({
        bidder: bidder1.publicKey,
        auction,
        vault,
        precedingBidder: null,
        referrerWhitelist: null,
        referrer: null,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([web3JsBidder1Signer])
      .rpc();
  });

  describe("before the end of the auction,", () => {
    it("nobody can claim the SOL", async () => {
      for (const signer of [
        web3JsAuctioneerSigner,
        web3JsBidder1Signer,
        web3JsSomebodySigner,
      ]) {
        await assert.rejects(async () => {
          await program.methods.claimPayment(seed)
            .accountsStrict({
              maker: signer.publicKey,
              mint: nftMint.publicKey,
              auction,
              vault,
              systemProgram: anchor.web3.SystemProgram.programId,
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

    it("nobody can claim the SOL...", async () => {
      for (const signer of [
        web3JsBidder1Signer,
        web3JsSomebodySigner,
      ]) {
        await assert.rejects(async () => {
          await program.methods.claimPayment(seed)
            .accountsStrict({
              maker: signer.publicKey,
              mint: nftMint.publicKey,
              auction,
              vault,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([signer])
            .rpc();
        }, () => true, "Claim should fail");
      }
    });

    it("...except the auctioneer", async () => {
      umi.use(signerIdentity(auctioneer));
      balanceBefore = await umi.rpc.getBalance(auctioneer.publicKey);
      await program.methods.claimPayment(seed)
        .accountsStrict({
          maker: web3JsAuctioneerSigner.publicKey,
          mint: nftMint.publicKey,
          auction,
          vault,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([web3JsAuctioneerSigner])
        .rpc();
    });

    it("The auctioneer balance in SOL should increase", async () => {
      const balanceAfter = await umi.rpc.getBalance(auctioneer.publicKey);
      assert(Number(balanceAfter.basisPoints) - Number(balanceBefore.basisPoints) == 1, "Balance should increase");
    });
  });
});
