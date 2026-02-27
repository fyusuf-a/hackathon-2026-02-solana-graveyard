# AGENTS.md - Developer Guide for Graveyard Hackathon

Guidelines for agentic coding agents working on this Solana/Anchor project.

## Project Overview

English auction smart contract on Solana with referral system:

- **Anchor** framework for Solana smart contracts
- **Rust** for on-chain programs
- **TypeScript** with Mocha/Chai for tests
- **Metaplex Umi** for NFT operations
- **Prettier** for formatting

## Build, Test, and Lint Commands

```bash
# Build the program
anchor build

# Run all tests
anchor test
yarn test

# Run single test file (recommended for debugging)
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/01_initialize.ts"

# Run specific test with grep
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts" --grep "Program successfully initializes"

# Linting (Prettier)
yarn lint
yarn lint:fix

# Other commands
anchor deploy
anchor keys list
```

## Project Structure

```
programs/graveyard-hackathon/src/
  ├── lib.rs              # Program entry, declare_id, instruction dispatch
  ├── errors.rs           # Custom errors (#[error_code] enum)
  ├── utils.rs            # Utility functions
  ├── instructions/      # Instruction handlers (each instruction = 1 file)
  │   ├── initialize.rs, create_auction.rs, bid.rs
  │   ├── claim_nft.rs, claim_payment.rs, whitelist_referrer.rs
  └── state/              # Account types with #[account] and #[derive(InitSpace)]
      ├── config.rs, english_auction.rs, referrers.rs
tests/
  ├── lib.ts              # Shared utilities (airdrop, NFT creation, auction setup)
  └── 01_*.ts, 02_*.ts... # Numbered test files (ordered by dependencies)
```

## Rust (Anchor) Code Style

### Imports

```rust
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::Config;
use crate::errors::AuctionError;
```

### Account Structs

```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, seeds = [b"config"], space = Config::DISCRIMINATOR.len() + Config::INIT_SPACE, bump)]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}
```

### Error Handling

```rust
#[error_code]
pub enum AuctionError {
    #[msg("Auction has not started")]
    AuctionNotStarted,
    #[msg("Bid is too low")]
    BidTooLow,
}
// Usage: require!(condition, AuctionError::ErrorCode);
```

### State with InitSpace

```rust
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}
// Space: Config::DISCRIMINATOR.len() + Config::INIT_SPACE
```

### Naming Conventions

- Modules: `snake_case` (`mod instructions;`)
- Functions: `snake_case` (`fn initialize()`)
- Types/Structs: `PascalCase` (`struct Initialize`, `enum AuctionError`)
- Variables: `snake_case` (`let current_bid`)
- Macros: `kebab-case` (`#[account]`, `#[derive]`)

## TypeScript Test Code Style

### Imports

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { expect } from "chai";
import { createNft, setupAuction, airdrop_if_needed } from "./lib";
```

### Anchor Client Usage

```typescript
const program = anchor.workspace
  .GraveyardHackathon as Program<GraveyardHackathon>;

// Use accountsStrict (recommended)
await program.methods
  .initialize()
  .accountsStrict({
    admin: admin.publicKey,
    config: pda,
    systemProgram: SystemProgram.programId,
  })
  .signers([admin])
  .rpc();

// BN types - always use new anchor.BN(value)
new anchor.BN(1000);

// PDA derivation
const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("auction"), seed.toArrayLike(Buffer, "le", 8)],
  program.programId
);
```

### Test Structure

```typescript
describe("Test Suite Name", () => {
  before(async () => {
    /* setup */
  });
  it("Test description", async () => {
    expect(result).to.equal(expectedValue);
  });
});
```

### Naming

- Files: `kebab-case` with number prefix (`01_initialize.ts`)
- Variables/functions: `camelCase` (`provider`, `setupAuction`)
- Types: `PascalCase` (`AuctionConfigResult`)

## Key Conventions

1. **Regenerate IDL**: Run `anchor build` after Rust changes to update `target/types/`
2. **Use `accountsStrict`**: Over `.accounts()` for explicit validation
3. **BN types**: Use `new anchor.BN(value)` in TypeScript
4. **Rent exemption**: Ensure PDAs have enough lamports
5. **Error messages**: Use descriptive `#[msg("...")]` attributes
6. **Test ordering**: Files numbered 01*, 02* - tests may depend on previous state
7. **PDA seeds**: Use `Buffer.from("seed")` for string seeds
8. **Umi integration**: Use `toWeb3JsKeypair()` and `toWeb3JsPublicKey()` for Metaplex interop
