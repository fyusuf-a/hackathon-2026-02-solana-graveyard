import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, KeypairSigner, signerIdentity } from "@metaplex-foundation/umi";
import { airdrop_if_needed } from './lib';
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import assert from "node:assert/strict";
import { setupAuction } from "./lib";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;


const umi = createUmi(provider.connection);
umi.use(mplTokenMetadata());

const auctioneer = generateSigner({ eddsa: umi.eddsa });
const secretKey = auctioneer.secretKey;
const web3JsAuctioneerSigner = Keypair.fromSecretKey(secretKey);

const bidder1 = generateSigner({ eddsa: umi.eddsa });
const web3JsBidder1Signer = Keypair.fromSecretKey(bidder1.secretKey);

const bidder2 = generateSigner({ eddsa: umi.eddsa });
const web3JsBidder2Signer = Keypair.fromSecretKey(bidder2.secretKey);

let seed: anchor.BN;
let nftMint: KeypairSigner;
let auctioneerAta: anchor.web3.PublicKey;
let vaultAta: anchor.web3.PublicKey;
let auction: anchor.web3.PublicKey;
let vault: anchor.web3.PublicKey;
let auctionStart: number;
let auctionEnd: number;

describe("Bids", () => {
  before(async () => {
    ({seed, nftMint, auctioneerAta, vaultAta, auction, vault} = await setupAuction(provider, umi, program, auctioneer));

    await airdrop_if_needed(provider, toWeb3JsPublicKey(bidder1.publicKey), 5);
    await airdrop_if_needed(provider, toWeb3JsPublicKey(bidder2.publicKey), 5);


    const time = Math.round(new Date().getTime() / 1000);
    auctionStart = time + 1;
    auctionEnd = time + 10;
    await program.methods.createAuction(
      seed,
      new BN(auctionStart),
      new BN(auctionEnd),
      new BN(0),
      new BN(0)
    )
      .accountsStrict({
        user: auctioneer.publicKey,
        mint: nftMint.publicKey,
        userAta: auctioneerAta,
        vaultAta,
        auction,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([web3JsAuctioneerSigner])
      .rpc();
  });

  describe("Before the beginning of the auction", () => {
    it("No bet can be made", async () => {
      umi.use(signerIdentity(bidder1));
      await assert.rejects(async () => {
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
      }, () => true, "Bid should fail");
    });
  });

  describe("After the beginning of the auction", () => {
    let balanceBefore: number;
    before(async () => {
      balanceBefore = await provider.connection.getBalance(vault);
      const now = new Date().getTime();
      await new Promise((resolve) => setTimeout(resolve, auctionStart * 1000 - now + 1500));
    });

    it("A bet can be made", async () => {
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

    it("The vault balance should increase", async () => {
      const balanceAfter = await provider.connection.getBalance(vault);
      assert(balanceAfter > balanceBefore, "The vault balance should have increased");
    });

    it("A bet cannot be made if its amount is lesser or equal than the current bet", async () => {
      umi.use(signerIdentity(bidder2));
      await assert.rejects(async () => {
        await program.methods.bid(seed, new BN(1))
          .accountsStrict({
            bidder: bidder2.publicKey,
            auction,
            vault,
            precedingBidder: bidder1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([web3JsBidder2Signer])
          .rpc();
      }, () => true, "Bid should fail");
    });

    it("A bet can be made if its amount is greater than the current bet", async () => {
        umi.use(signerIdentity(bidder2));
        await program.methods.bid(seed, new BN(2))
          .accountsStrict({
            bidder: bidder2.publicKey,
            auction,
            vault,
            precedingBidder: toWeb3JsPublicKey(bidder1.publicKey),
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([web3JsBidder2Signer])
          .rpc();
    });
  });

  /*describe("After the end of the auction", () => {
    before(async () => {
      const now = new Date().getTime();
      await new Promise((resolve) => setTimeout(resolve, auctionEnd * 1000 - now + 1500));
    });

    it("No bet can be made", async () => {
      umi.use(signerIdentity(bidder1));
      await assert.rejects(async () => {
        await program.methods.bid(new BN(100))
          .accounts({
            bidder: bidder1.publicKey,
            mint: nftMint.publicKey,
            auction,
            vault,
            vaultState,
            precedingBidder: bidder2.publicKey,
          })
          .signers([web3JsBidder1Signer])
          .rpc();
      }, () => true, "Bid should fail");
    });
  });*/
});
