import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { admin, airdrop_if_needed } from "./lib";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

describe("Program initialization", () => {
  it("Program sucessfully initializes", async () => {
    await airdrop_if_needed(provider, admin.publicKey, 5);
  });
});
