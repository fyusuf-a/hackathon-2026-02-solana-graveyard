import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { admin, airdrop_if_needed } from "./lib";
import { expect } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

describe("Program initialization", () => {
  it("Program sucessfully initializes", async () => {
    await airdrop_if_needed(provider, admin.publicKey, 5);
    await program.methods.initialize()
      .accounts({
        admin: admin.publicKey
      })
      .signers([admin])
      .rpc();
  });

  it("After initialization, the program stores the admin address", async () => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync([
      Buffer.from("config")
    ], program.programId);
    const accountInfo = await program.account.config.fetch(pda);
    expect(accountInfo.admin.equals(admin.publicKey));
  });
});
