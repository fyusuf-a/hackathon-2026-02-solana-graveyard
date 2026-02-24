import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { generateSigner, KeypairSigner, signerIdentity } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { airdrop_if_needed, createNft, ONE_SECOND, randomBN } from './lib';
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import { BN } from "bn.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { expect } from "chai";

const provider = anchor.AnchorProvider.env();

const umi = createUmi(provider.connection);
const auctioneer = generateSigner({ eddsa: umi.eddsa });
const secretKey = auctioneer.secretKey;
const web3JsSigner = Keypair.fromSecretKey(secretKey);

umi.use(signerIdentity(auctioneer));
umi.use(mplTokenMetadata());
anchor.setProvider(provider);

const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

const seed = randomBN(1000);
let nftMint: KeypairSigner;
let userAta: anchor.web3.PublicKey;
let vaultAta: anchor.web3.PublicKey;
let auction: anchor.web3.PublicKey;
let vault: anchor.web3.PublicKey;

describe("Auction creation", () => {
  before(async () => {
    await airdrop_if_needed(provider, toWeb3JsPublicKey(auctioneer.publicKey), 5);
    nftMint  = await createNft(umi);

    auction = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('auction'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0];

    vaultAta = getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), auction, true);

    userAta = getAssociatedTokenAddressSync(toWeb3JsPublicKey(nftMint.publicKey), toWeb3JsPublicKey(auctioneer.publicKey));
    vault = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), seed.toArrayLike(Buffer, "le", 8)], program.programId)[0];
  });

  it("Creates an auction", async () => {

    await program.methods.createAuction(
      seed,
      new BN(30 * ONE_SECOND),
      new BN(60 * ONE_SECOND),
      new BN(0),
      new BN(0)
    )
      .accountsStrict({
        user: auctioneer.publicKey,
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

  it("After auction creation, the token should be transfered from user to NFT vault", async () => {

    const vaultAtaAccount = await provider.connection.getParsedAccountInfo(vaultAta);
    const vaultAtaData = vaultAtaAccount?.value?.data as anchor.web3.ParsedAccountData;
    const vaultTokenAmount = vaultAtaData.parsed.info.tokenAmount.uiAmount;
    
    const userAtaAccount = await provider.connection.getParsedAccountInfo(userAta);
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
