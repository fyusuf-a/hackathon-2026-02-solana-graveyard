import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner } from "@metaplex-foundation/umi";
import { airdrop_if_needed, createAuction } from './lib';
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import assert from "node:assert/strict";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { beforeEach } from "mocha";

const provider_ = anchor.AnchorProvider.env();

const provider = new anchor.AnchorProvider(
  provider_.connection,
  provider_.wallet,
  {
    commitment: 'confirmed',
  }
);

anchor.setProvider(provider);
const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;


const umi = createUmi(provider.connection);
umi.use(mplTokenMetadata());

const auctioneer = generateSigner({ eddsa: umi.eddsa });
const secretKey = auctioneer.secretKey;
const web3JsAuctioneerSigner = Keypair.fromSecretKey(secretKey);

const bidder1 = generateSigner({ eddsa: umi.eddsa });
const web3JsBidder1Signer = Keypair.fromSecretKey(bidder1.secretKey);

const referrer = generateSigner({ eddsa: umi.eddsa });
const web3JsReferrerSigner = Keypair.fromSecretKey(referrer.secretKey);

let seed: anchor.BN;
let auction: anchor.web3.PublicKey;
let vault: anchor.web3.PublicKey;
let auctionStart: number;
let auctionEnd: number;

let bidder1BalanceBefore: number;
let bidder1BalanceAfter: number;
let referrerBalanceBefore: number;
let referrerBalanceAfter: number;
let vaultBalanceBefore: number;
let vaultBalanceAfter: number;

const BASE_FEE_BPS = 500; // 5% base fee for the buyer
const BUYER_DISCOUNT_BPS = 200; // 2% discount for buyers with a referrer

describe("Bids", () => {
  beforeEach(async () => {
    const time = Math.round(new Date().getTime() / 1000);
    auctionStart = time;
    auctionEnd = time + 10;
    ({seed, auction, vault} = await createAuction(auctioneer, auctionStart, auctionEnd, program, provider, umi, { baseFeeBps: BASE_FEE_BPS, buyerDiscountBps: BUYER_DISCOUNT_BPS }));

    await airdrop_if_needed(provider, toWeb3JsPublicKey(bidder1.publicKey), 5);

    await program.methods.whitelistReferrer(seed)
      .accountsStrict({
        maker: auctioneer.publicKey,
        auction,
        referrerWhitelist: anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('whitelist'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0],
        referrer: web3JsReferrerSigner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([web3JsAuctioneerSigner])
      .rpc();

    await new Promise(resolve => setTimeout(resolve, 1000));

  });

  describe("When a bid without referrer is done...", async () => {
    it("all the lamports are sent to the vault", async () => {
      const vaultBalanceBefore = await provider.connection.getBalance(vault);
      await program.methods.bid(seed, new anchor.BN(5_000))
        .accountsStrict({
          bidder: bidder1.publicKey,
          auction,
          vault,
          precedingBidder: null,
          referrerWhitelist: anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('whitelist'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0],
          referrer: null,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([web3JsBidder1Signer])
        .rpc();

      const vaultBalanceAfter = await provider.connection.getBalance(vault);
      assert(vaultBalanceAfter === vaultBalanceBefore + 5_000, `Expected vault balance to increase by 10_000 lamports, but it increased by ${vaultBalanceAfter - vaultBalanceBefore} lamports`);
    });
  });

  describe("When a bid with a referrer is done...", async () => {
    it("the amount of lamports minus the fee are sent to the vault", async () => {
      bidder1BalanceBefore = await provider.connection.getBalance(web3JsBidder1Signer.publicKey);
      referrerBalanceBefore = await provider.connection.getBalance(web3JsReferrerSigner.publicKey);
      vaultBalanceBefore = await provider.connection.getBalance(vault);

      await program.methods.bid(seed, new anchor.BN(10_000))
        .accountsStrict({
          bidder: bidder1.publicKey,
          auction,
          vault,
          precedingBidder: null,
          referrerWhitelist: anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('whitelist'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0],
          referrer: web3JsReferrerSigner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([web3JsBidder1Signer])
        .rpc();

      vaultBalanceAfter = await provider.connection.getBalance(vault);

      assert(vaultBalanceAfter === vaultBalanceBefore + (10_000 - BASE_FEE_BPS), `Expected vault balance to increase by ${10_000 - BASE_FEE_BPS} lamports, but it increased by ${vaultBalanceAfter - vaultBalanceBefore} lamports`);
    });

    it("the bidder pays a lesser amount due to the buyer discount", async () => {
      bidder1BalanceAfter = await provider.connection.getBalance(web3JsBidder1Signer.publicKey);

      assert(bidder1BalanceAfter === bidder1BalanceBefore - (10_000 - BUYER_DISCOUNT_BPS), `Expected bidder1 balance to decrease by ${10_000 - BUYER_DISCOUNT_BPS} lamports, but it decreased by ${bidder1BalanceBefore - bidder1BalanceAfter} lamports`);
    });

    it("the referrer receives the remainder", async () => {
      referrerBalanceAfter = await provider.connection.getBalance(web3JsReferrerSigner.publicKey);

      assert(referrerBalanceAfter === referrerBalanceBefore + (BASE_FEE_BPS - BUYER_DISCOUNT_BPS), `Expected referrer balance to increase by ${BASE_FEE_BPS - BUYER_DISCOUNT_BPS} lamports, but it decreased by ${referrerBalanceAfter - referrerBalanceBefore} lamports`);
    });
  });
});
