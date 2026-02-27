import { BN, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "../../../target/idl/graveyard_hackathon.json";
import { GraveyardHackathon } from "../../../target/types/graveyard_hackathon";

const PROGRAM_ID = new PublicKey(
  "FMbPxmEm3fDtPzH8RTpqWx9xT1bd3Bio38vg7MrXr9Rv"
);

export function getProgram(
  connection: Connection,
  wallet: Wallet
): Program<GraveyardHackathon> {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );

  return new Program(idl as Idl, provider) as Program<GraveyardHackathon>;
}

export async function getAuctionPda(seed: BN): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), seed.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

export async function getVaultPda(seed: BN): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), seed.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

export async function getUserAta(
  mint: PublicKey,
  user: PublicKey
): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export async function getVaultAta(
  mint: PublicKey,
  auction: PublicKey
): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [auction.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

const AUCTION_DISCRIMINATOR = [218, 94, 247, 242, 126, 233, 131, 81];

export async function getAllAuctions(
  connection: Connection
): Promise<PublicKey[]> {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID)

  const filteredAccounts = accounts.filter((acc) => {
    const data = acc.account.data;
    return (
      data.length > 8 &&
      data.slice(0, 8).equals(Buffer.from(AUCTION_DISCRIMINATOR))
    );
  });

  return filteredAccounts.map((acc) => acc.pubkey);
}

export { PROGRAM_ID };
