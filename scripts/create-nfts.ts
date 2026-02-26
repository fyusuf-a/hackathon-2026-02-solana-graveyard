import * as anchor from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  generateSigner,
  signerIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";

const connection = new anchor.web3.Connection("http://localhost:8899");

async function main() {
  const umi = createUmi(connection).use(mplTokenMetadata());
  const auctioneer = generateSigner({ eddsa: umi.eddsa });
  umi.use(signerIdentity(auctioneer));

  const secretKey = Array.from(auctioneer.secretKey);
  const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log("Funding wallet:", keypair.publicKey.toString());
  const airdropSig = await connection.requestAirdrop(
    keypair.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSig);

  console.log("Wallet:", auctioneer.publicKey.toString());
  console.log("Creating NFTs...\n");

  for (let i = 1; i <= 2; i++) {
    const mint = generateSigner(umi);
    await createNft(umi, {
      mint,
      name: `Test NFT ${i}`,
      symbol: `TNFT${i}`,
      uri: "https://arweave.net/123",
      sellerFeeBasisPoints: percentAmount(5),
    }).sendAndConfirm(umi);
    console.log(`NFT ${i} created:`, mint.publicKey.toString());
  }
}

main().catch(console.error);
