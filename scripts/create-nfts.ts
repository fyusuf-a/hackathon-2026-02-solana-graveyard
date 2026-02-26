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
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import dummyKeypair from "../runbooks/dummy-keypair.json";
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';

const connection = new anchor.web3.Connection("http://localhost:8899");

async function main() {
  const umi = createUmi(connection).use(mplTokenMetadata());
  // create signer from dummy keypair for testing purposes
  const dummyKeypairUint8Array = new Uint8Array(dummyKeypair);
  const dummySigner = anchor.web3.Keypair.fromSecretKey(dummyKeypairUint8Array);

  const umiKeypair = fromWeb3JsKeypair(dummySigner);
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));

  const airdropSig = await connection.requestAirdrop(
    dummySigner.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSig);

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
