import { Connection, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

const LOCALNET_ENDPOINT = "http://localhost:8899";
const METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjbCtYieDbvfPXA";

export interface NFTInfo {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
}

export async function fetchUserNFTs(ownerAddress: string): Promise<NFTInfo[]> {
  const connection = new Connection(LOCALNET_ENDPOINT);

  try {
    const owner = new PublicKey(ownerAddress);

    // Get all token accounts owned by this address
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      owner,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9We613PSg"),
      }
    );

    const nfts: NFTInfo[] = [];

    for (const account of tokenAccounts.value) {
      const parsed = account.account.data.parsed;
      const mintAddress = parsed.info.mint;
      const amount = parsed.info.amount;

      // Only include tokens with amount > 0 (NFTs)
      if (amount === "0" || amount === 0) continue;

      try {
        // Fetch metadata account
        const [metadataAddress] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
            new PublicKey(mintAddress).toBuffer(),
          ],
          new PublicKey(METADATA_PROGRAM_ID)
        );

        const accountInfo = await connection.getAccountInfo(metadataAddress);
        if (accountInfo && accountInfo.data) {
          const data = accountInfo.data;

          let offset = 1 + 1 + 32 + 4; // skip key, isMutable, updateAuthority
          const nameLen = data.readUInt32BE(offset);
          offset += 4;
          const name = data.slice(offset, offset + nameLen).toString("utf-8");
          offset += nameLen;

          const symbolLen = data.readUInt32BE(offset);
          offset += 4;
          const symbol = data
            .slice(offset, offset + symbolLen)
            .toString("utf-8");
          offset += symbolLen;

          const uriLen = data.readUInt32BE(offset);
          offset += 4;
          const uri = data.slice(offset, offset + uriLen).toString("utf-8");

          nfts.push({
            mint: mintAddress,
            name: name || "Unnamed NFT",
            symbol: symbol || "",
            uri,
          });
        }
      } catch (e) {
        // If metadata fetch fails, still add with basic info
        nfts.push({
          mint: mintAddress,
          name: "NFT",
          symbol: "",
          uri: "",
        });
      }
    }

    return nfts;
  } catch (e) {
    console.error("Failed to fetch NFTs:", e);
    return [];
  }
}
