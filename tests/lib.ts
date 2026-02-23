import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";

export async function airdrop_if_needed(provider: AnchorProvider, publicKey: anchor.web3.PublicKey, amount: number) {
  const balance = await provider.connection.getBalance(publicKey);
  if (balance === 0) {
    const signature = await provider.connection.requestAirdrop(publicKey, amount * anchor.web3.LAMPORTS_PER_SOL);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...latestBlockhash,
    }, "confirmed")
  }
}

export const admin = anchor.web3.Keypair.generate();
