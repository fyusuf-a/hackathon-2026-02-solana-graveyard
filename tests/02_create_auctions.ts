import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, KeypairSigner, signerIdentity } from "@metaplex-foundation/umi";
import { setupAuction, ONE_SECOND } from './lib';
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { Keypair } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const umi = createUmi(provider.connection);
const auctioneer = generateSigner({ eddsa: umi.eddsa });
const secretKey = auctioneer.secretKey;
const web3JsSigner = Keypair.fromSecretKey(secretKey);

umi.use(signerIdentity(auctioneer));
umi.use(mplTokenMetadata());

const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

let seed: anchor.BN;
let nftMint: KeypairSigner;
let auctioneerAta: anchor.web3.PublicKey;
let vaultAta: anchor.web3.PublicKey;
let auction: anchor.web3.PublicKey;
let vault: anchor.web3.PublicKey;

describe("Auction creation", () => {
  before(async () => {
    ({seed, nftMint, auctioneerAta, vaultAta, auction, vault} = await setupAuction(provider, umi, program, auctioneer));
  });

  it("Creates an auction", async () => {

    await program.methods.createAuction(
      seed,
      new anchor.BN(30 * ONE_SECOND),
      new anchor.BN(60 * ONE_SECOND),
      new anchor.BN(0),
      new anchor.BN(0)
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
      .signers([web3JsSigner])
      .rpc();
  });

  it("After auction creation, the token should be transfered from user to NFT vault", async () => {

    const vaultAtaAccount = await provider.connection.getParsedAccountInfo(vaultAta);
    const vaultAtaData = vaultAtaAccount?.value?.data as anchor.web3.ParsedAccountData;
    const vaultTokenAmount = vaultAtaData.parsed.info.tokenAmount.uiAmount;
    
    const userAtaAccount = await provider.connection.getParsedAccountInfo(auctioneerAta);
    const userAtaData = userAtaAccount?.value?.data as anchor.web3.ParsedAccountData;
    const userTokenAmount = userAtaData.parsed.info.tokenAmount.uiAmount;

    expect(vaultTokenAmount).to.equal(1);
    expect(userTokenAmount).to.equal(0);
  });

  it("After auction creation, the SOL vault is rent-exempt", async () => {
    const [minBalance, vaultBalance] = await Promise.all([
      provider.connection.getMinimumBalanceForRentExemption(0),
      provider.connection.getBalance(vault),
    ]);
    
    // The vault should be rent-exempt, which is around 89088 lamports at the time of writing
    expect(vaultBalance).to.be.gte(minBalance);
  });
});
