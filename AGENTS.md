# AGENTS.md - Developer Guide for Graveyard Hackathon

Guidelines for agentic coding agents working on this Solana/Anchor project.

## Project Overview

English auction smart contract on Solana with referral system:

- **Anchor** framework for Solana smart contracts
- **Rust** for on-chain programs
- **TypeScript** for tests and client code
- **Mocha/Chai** for testing

## Build, Test, and Lint Commands

```bash
# Build
anchor build
anchor build --program-name graveyard_hackathon

# Run all tests
anchor test
yarn test

# Run single test file
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/01_initialize.ts"

# Run specific test with grep
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts" --grep "Program sucessfully initializes"

# Linting
yarn lint            # Check formatting
yarn lint:fix        # Fix formatting issues

# Other
anchor deploy
anchor keys list
```

## Rust (Anchor) Code Style

### Imports

```rust
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::Config;
use crate::errors::AuctionError;
```

### Naming

- Modules: `snake_case` (`mod instructions;`)
- Functions: `snake_case` (`fn initialize()`)
- Types/Structs: `PascalCase` (`struct Initialize`, `enum AuctionError`)
- Variables: `snake_case` (`let current_bid`)
- Macros: `kebab-case` (`#[account]`, `#[derive]`)

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

// Usage
require!(time_elapsed >= 0, AuctionError::AuctionNotStarted);
require!(lamports >= current_bid + min_increment, AuctionError::BidTooLow);
```

### Space Calculation

```rust
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}
// space = Config::DISCRIMINATOR.len() + Config::INIT_SPACE
```

## TypeScript Test Code Style

### Imports

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GraveyardHackathon } from "../target/types/graveyard_hackathon";
import { expect } from "chai";
```

### Naming

- Files: `kebab-case` (`01_initialize.ts`)
- Variables/functions: `camelCase` (`provider`, `setupAuction`)
- Types: `PascalCase` (`AuctionConfigResult`)

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

### Anchor Client Usage

```typescript
const program = anchor.workspace.GraveyardHackathon as Program<GraveyardHackathon>;

// Use accountsStrict (recommended)
await program.methods.initialize()
  .accountsStrict({ admin: admin.publicKey, ... })
  .signers([admin])
  .rpc();

// BN types
new anchor.BN(value)
```

## Project Structure

```
programs/graveyard-hackathon/src/
  ├── lib.rs              # Program entry point
  ├── errors.rs           # Custom errors
  ├── utils.rs            # Utility functions
  ├── instructions/       # Instruction handlers
  │   ├── initialize.rs, create_auction.rs, bid.rs
  │   ├── claim_nft.rs, claim_payment.rs, whitelist_referrer.rs
  └── state/              # Account types
      ├── config.rs, english_auction.rs, referrers.rs
tests/
  ├── lib.ts              # Shared test utilities
  └── 01_initialize.ts, 02_create_auctions.ts, 03_bid.ts...
```

## Key Conventions

1. **Regenerate IDL after building**: Run `anchor build` to update `target/types/`
2. **Use `accountsStrict`** over `.accounts()` for explicit validation
3. **Handle BN types**: Use `new anchor.BN(value)` in TypeScript
4. **Rent exemption**: Ensure PDAs have enough lamports
5. **Error messages**: Use descriptive `#[msg("...")]` attributes
6. **Test ordering**: Files numbered 01*, 02* - may depend on previous tests
7. **PDA derivation**: Use `anchor.web3.PublicKey.findProgramAddressSync`
