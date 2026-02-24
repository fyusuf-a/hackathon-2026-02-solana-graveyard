import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, KeypairSigner, signerIdentity } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { airdrop_if_needed, createNft, ONE_SECOND } from './lib';
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();

const umi = createUmi(provider.connection);
const auctioneer = generateSigner({ eddsa: umi.eddsa });
const secretKey = auctioneer.secretKey;
const web3JsSigner = Keypair.fromSecretKey(secretKey);

umi.use(signerIdentity(auctioneer));
umi.use(mplTokenMetadata());
anchor.setProvider(provider);

const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

let nftMint: KeypairSigner;
let vaultAta: anchor.web3.PublicKey;
let auction: anchor.web3.PublicKey;

describe("Auction creation", () => {
  before(async () => {
    await airdrop_if_needed(provider, toWeb3JsPublicKey(auctioneer.publicKey), 5);
    nftMint  = await createNft(umi);

    auction = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('auction'), toWeb3JsPublicKey(nftMint.publicKey).toBuffer()], program.programId)[0];

    const vaultAtaAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        web3JsSigner,
        toWeb3JsPublicKey(nftMint.publicKey),
        auction,
        true,
      );

    vaultAta = vaultAtaAccount.address;
  });

  it("Creates an auction", async () => {
    const userAta = getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), toWeb3JsPublicKey(auctioneer.publicKey));
    const vault = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), toWeb3JsPublicKey(nftMint.publicKey).toBuffer()], program.programId)[0];

    await program.methods.createAuction(
      new BN(30 * ONE_SECOND),
      new BN(60 * ONE_SECOND),
      new BN(0),
      new BN(0)
    )
      .accountsStrict({
        payer: auctioneer.publicKey,
        mint: nftMint.publicKey,
        userAta,
        vaultAta,
        auction,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([web3JsSigner])
      .rpc();
  });
});
