# 🎮 MAGIC BASER → MAGICBLOCK SOLANA PORT

## OBJECTIVE
Port the Magic Baser game (Vampire Survivors clone) from Base (EVM) to Solana using MagicBlock Ephemeral Rollups to achieve real-time performance (10-50ms latency).

---

## 📁 PROJECT STRUCTURE

```
magic-baser-solana/
├── programs/                    # Solana Programs (Anchor/BOLT)
│   └── magic_baser/
│       ├── src/
│       │   ├── lib.rs          # Main program entry point
│       │   ├── state.rs        # Account state (player, session)
│       │   ├── instructions/
│       │   │   ├── init_player.rs
│       │   │   ├── start_game.rs
│       │   │   ├── use_revive.rs
│       │   │   └── end_game.rs
│       │   └── errors.rs
│       └── Cargo.toml
├── app/                         # Frontend (React/Next.js)
│   ├── src/
│   │   ├── game/               # Game engine (Canvas)
│   │   │   ├── Game.ts
│   │   │   ├── entities/
│   │   │   ├── weapons/
│   │   │   ├── systems/
│   │   │   └── rendering/
│   │   ├── solana/             # Blockchain integration
│   │   │   ├── client.ts       # Solana + MagicBlock client
│   │   │   ├── wallet.ts       # Phantom/Solflare connect
│   │   │   └── transactions.ts
│   │   └── components/
│   ├── package.json
│   └── next.config.js
├── tests/
└── Anchor.toml
```

---

## 🔗 MAGICBLOCK INTEGRATION

### Key Concepts:

**1. Ephemeral Rollups (ER)**
- Temporary high-speed SVM runtimes (10-50ms latency)
- Gasless transactions within session
- State delegation: accounts are locked on L1, modified in ER, committed back

**2. Magic Router**
- Automatic transaction routing between L1 and ER
- RPC endpoint: `https://devnet-router.magicblock.app` (devnet)
- For mainnet: run your own local ER validator

**3. Delegation Flow**
```
START GAME:
1. Player account delegated to ER
2. Game session runs in ER (fast, gasless)
3. On death/exit → commit state back to Solana L1

ACCOUNT STRUCTURE:
- PlayerAccount (L1): wallet, owned_characters, revives, total_gold
- GameSession (ER): hp, position, weapons, xp, gold_earned, time_survived
```

### Integration Code:

```typescript
// solana/client.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { sendMagicTransaction } from "@magicblock/sdk";

const MAGIC_ROUTER = "https://devnet-router.magicblock.app";
const SOLANA_DEVNET = "https://api.devnet.solana.com";

export class MagicBlockClient {
  private routerConnection: Connection;
  private baseConnection: Connection;
  
  constructor() {
    this.routerConnection = new Connection(MAGIC_ROUTER, "confirmed");
    this.baseConnection = new Connection(SOLANA_DEVNET, "confirmed");
  }
  
  // Send transaction via Magic Router
  async sendTransaction(tx: Transaction, signers: Keypair[]) {
    return sendMagicTransaction(this.routerConnection, tx, signers);
  }
  
  // Delegate account to ER for game session
  async delegateGameSession(playerPda: PublicKey) {
    // CPI to delegation program
  }
  
  // Commit final state back to L1
  async commitAndUndelegate(sessionPda: PublicKey) {
    // commit_and_undelegate_accounts CPI
  }
}
```

---

## 📜 SOLANA PROGRAM (Anchor)

### State Accounts:

```rust
// state.rs
use anchor_lang::prelude::*;

#[account]
pub struct PlayerAccount {
    pub authority: Pubkey,           // Wallet owner
    pub owned_characters: Vec<String>, // ["imelda", "antonio", ...]
    pub revives: u8,                 // Purchased revives
    pub total_gold: u64,             // Lifetime gold earned
    pub games_played: u32,
    pub best_time: u32,              // Best survival time in seconds
    pub best_wave: u8,
    pub bump: u8,
}

#[account]
pub struct GameSession {
    pub player: Pubkey,              // Reference to PlayerAccount
    pub character_id: String,        // Active character
    pub hp: u16,
    pub max_hp: u16,
    pub level: u8,
    pub xp: u32,
    pub gold_earned: u32,
    pub time_survived: u32,          // Seconds
    pub wave: u8,
    pub is_active: bool,
    pub started_at: i64,
    pub bump: u8,
}
```

### Instructions:

```rust
// instructions/start_game.rs
pub fn start_game(ctx: Context<StartGame>, character_id: String) -> Result<()> {
    let session = &mut ctx.accounts.game_session;
    let player = &ctx.accounts.player_account;
    
    // Verify character is unlocked
    require!(
        player.owned_characters.contains(&character_id),
        GameError::CharacterNotOwned
    );
    
    // Initialize session
    session.player = player.key();
    session.character_id = character_id;
    session.hp = 100;
    session.max_hp = 100;
    session.level = 1;
    session.xp = 0;
    session.gold_earned = 0;
    session.time_survived = 0;
    session.wave = 1;
    session.is_active = true;
    session.started_at = Clock::get()?.unix_timestamp;
    
    // Delegate session to Ephemeral Rollup
    delegate_account(
        &ctx.accounts.payer,
        &session.to_account_info(),
        &ctx.accounts.owner_program,
        session_seeds,
        0,      // No time limit
        3_000,  // Update frequency: 3 seconds
    )?;
    
    Ok(())
}

// instructions/use_revive.rs
pub fn use_revive(ctx: Context<UseRevive>) -> Result<()> {
    let player = &mut ctx.accounts.player_account;
    let session = &mut ctx.accounts.game_session;
    
    require!(player.revives > 0, GameError::NoRevivesLeft);
    require!(session.hp == 0, GameError::NotDead);
    
    player.revives -= 1;
    session.hp = session.max_hp / 2; // Revive with 50% HP
    
    Ok(())
}

// instructions/end_game.rs
pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
    let player = &mut ctx.accounts.player_account;
    let session = &ctx.accounts.game_session;
    
    // Update player statistics
    player.total_gold += session.gold_earned as u64;
    player.games_played += 1;
    
    if session.time_survived > player.best_time {
        player.best_time = session.time_survived;
    }
    if session.wave > player.best_wave {
        player.best_wave = session.wave;
    }
    
    // Undelegate and commit state
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&session.to_account_info()],
        &ctx.accounts.delegation_program,
    )?;
    
    Ok(())
}
```

---

## 🎮 FRONTEND GAME ENGINE

### Adapting Existing Code:

Most of the game code (game.js, entities.js, weapons.js) remains **UNCHANGED** - it's pure Canvas rendering.

**What needs to change:**

1. **shopContract.js → solana/transactions.ts**
   - Replace ethers.js with @solana/web3.js
   - Use Anchor client to call the program

2. **baseAuth.js → solana/wallet.ts**
   - Replace WalletConnect/Coinbase with Phantom/Solflare
   - Use @solana/wallet-adapter-react

3. **MagicBlock Integration:**

```typescript
// game/GameManager.ts
export class GameManager {
  private magicClient: MagicBlockClient;
  private sessionPda: PublicKey | null = null;
  
  async startGame(characterId: string) {
    // 1. Create game session account
    // 2. Delegate to Ephemeral Rollup
    this.sessionPda = await this.magicClient.startGameSession(characterId);
    
    // 3. Start game loop
    this.game.start(characterId);
  }
  
  async onPlayerDeath() {
    // Record death in ER (instant, gasless)
    await this.magicClient.recordDeath(this.sessionPda);
    
    // Show UI: Revive or End
    this.showDeathScreen();
  }
  
  async useRevive() {
    // L1 transaction (requires signature + gas)
    await this.magicClient.useRevive(this.sessionPda);
    
    // Continue game
    this.game.revivePlayer();
  }
  
  async endGame() {
    // Commit and undelegate (finalize on L1)
    await this.magicClient.endGame(this.sessionPda);
    
    // Show results
    this.showGameOverScreen();
  }
}
```

---

## 🔄 TRANSACTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                         GAME START                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. User clicks "Start Game"                                      │
│ 2. Frontend calls start_game instruction                         │
│ 3. GameSession account created on Solana L1                      │
│ 4. Account delegated to Ephemeral Rollup                         │
│ 5. Game loop starts (all state changes in ER - GASLESS)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      GAMEPLAY (in ER)                            │
├─────────────────────────────────────────────────────────────────┤
│ • Enemy kills → XP/Gold updates (instant, gasless)               │
│ • Level ups → stat changes (instant, gasless)                    │
│ • Damage taken → HP updates (instant, gasless)                   │
│ • Wave progression (instant, gasless)                            │
│                                                                  │
│ Latency: 10-50ms per update                                      │
│ Cost: $0 (gasless in ER)                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       PLAYER DEATH                               │
├─────────────────────────────────────────────────────────────────┤
│ Option A: USE REVIVE                                             │
│   → L1 transaction (pay ~0.00001 SOL gas)                        │
│   → Decrement revives, restore HP                                │
│   → Continue in ER                                               │
│                                                                  │
│ Option B: END GAME                                               │
│   → Commit final state to L1                                     │
│   → Undelegate account                                           │
│   → Update player stats (gold, best_time, etc.)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 DEPENDENCIES

### Solana Program (Cargo.toml):
```toml
[dependencies]
anchor-lang = "0.29.0"
ephemeral-rollups-sdk = "0.1"
```

### Frontend (package.json):
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.87.0",
    "@solana/wallet-adapter-react": "^0.15.0",
    "@solana/wallet-adapter-phantom": "^0.9.0",
    "@coral-xyz/anchor": "^0.29.0",
    "@magicblock/sdk": "latest",
    "react": "^18.2.0",
    "next": "^14.0.0"
  }
}
```

---

## 🚀 DEVELOPMENT STEPS

### Phase 1: Solana Program (Week 1)
1. [ ] Setup Anchor project with BOLT CLI
2. [ ] Implement PlayerAccount state
3. [ ] Implement GameSession state  
4. [ ] Write init_player instruction
5. [ ] Write start_game with delegation
6. [ ] Write use_revive instruction
7. [ ] Write end_game with commit/undelegate
8. [ ] Deploy to devnet

### Phase 2: Frontend Integration (Week 2)
1. [ ] Setup Next.js + wallet adapter
2. [ ] Create MagicBlockClient class
3. [ ] Port game engine (copy existing JS)
4. [ ] Connect wallet UI
5. [ ] Implement start game flow
6. [ ] Implement death/revive flow
7. [ ] Implement end game flow

### Phase 3: Testing & Polish (Week 3)
1. [ ] Test on MagicBlock devnet
2. [ ] Verify latency (should be <50ms)
3. [ ] Test revive transactions
4. [ ] UI/UX polish
5. [ ] Mobile responsive

### Phase 4: Mainnet (Week 4)
1. [ ] Setup local ER validator for mainnet
2. [ ] Deploy program to mainnet-beta
3. [ ] Configure Magic Router for mainnet
4. [ ] Final testing
5. [ ] Launch!

---

## ⚠️ KEY DIFFERENCES FROM BASE

| Aspect | Base (current) | Solana + MagicBlock |
|--------|----------------|---------------------|
| Latency | 2-4 seconds | 10-50ms |
| In-game gas | Gasless (Paymaster) | Gasless (ER) |
| Revive cost | 0.0003 ETH (~$0.80) | ~0.00001 SOL (~$0.002) |
| Wallet | Coinbase/WalletConnect | Phantom/Solflare |
| Smart Contract | Solidity | Rust (Anchor) |
| State storage | Contract storage | Accounts (PDAs) |

---

## 🎯 MVP SCOPE (for incubator)

**Included:**
- ✅ Wallet connect (Phantom)
- ✅ Start game → delegate to ER
- ✅ Full gameplay loop (in ER, gasless)
- ✅ Revive mechanic (L1 transaction)
- ✅ End game → commit stats to L1
- ✅ Leaderboard (best time, best wave)

**Excluded (v2):**
- ❌ Shop purchases (buy characters)
- ❌ NFT characters
- ❌ Token rewards
- ❌ Multiplayer

---

## 📚 REFERENCE CODE

### Supersize (MagicBlock game example):
- GitHub: https://github.com/Lewarn00/supersize-solana
- Live: https://supersize.gg

### MagicBlock Docs:
- Quickstart: https://docs.magicblock.gg/pages/get-started/how-integrate-your-program/quickstart
- BOLT ECS: https://docs.magicblock.gg/pages/tools/bolt/introduction
- Magic Router: https://docs.magicblock.gg/pages/ephemeral-rollups-ers/introduction/magic-router

### Ephemeral Rollups SDK:
- GitHub: https://github.com/magicblock-labs/ephemeral-rollups-sdk

---

## 💡 TIPS

1. **Don't rewrite the game engine** - game.js, entities.js, weapons.js work perfectly, just port them as-is

2. **State in ER updates automatically** - no need to explicitly send transactions for every HP/XP change

3. **Revive is the only L1 transaction during gameplay** - this is critical for monetization

4. **Use Magic Router** - it automatically decides where to send the transaction (ER or L1)

5. **Test on devnet first** - public ER validators are available for free

---

## 🏁 GETTING STARTED

```bash
# 1. Install Anchor and BOLT CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest

# 2. Create project
anchor init magic-baser-solana
cd magic-baser-solana

# 3. Add ephemeral-rollups-sdk
# In programs/magic_baser/Cargo.toml:
# ephemeral-rollups-sdk = "0.1"

# 4. Write first instruction (init_player)
# 5. Deploy to devnet
anchor build
anchor deploy --provider.cluster devnet
```

Good luck! 🚀

---
---

# CURSOR SYSTEM PROMPT - Magic Baser Solana Port

Use this prompt as **Custom Instructions** in Cursor Settings or paste it at the beginning of your chat.

---

```
You are an expert Solana/Anchor developer helping to port a Vampire Survivors-style game from Base (EVM) to Solana using MagicBlock Ephemeral Rollups.

## PROJECT CONTEXT

**Original Game:** Magic Baser (magicbased.app)
- Vampire Survivors clone on Base network
- Canvas-based rendering (vanilla JS)
- Features: characters, weapons, waves, XP/gold, revive mechanic
- Monetization: revive purchases (0.0003 ETH)

**Target:** Solana + MagicBlock Ephemeral Rollups
- 10-50ms latency (vs 2-4s on Base)
- Gasless gameplay in Ephemeral Rollup
- Revive as L1 transaction

## TECH STACK

**Backend (Solana Program):**
- Anchor framework (Rust)
- ephemeral-rollups-sdk for delegation
- PDAs for player/session state

**Frontend:**
- Next.js 14 + React 18
- @solana/web3.js
- @solana/wallet-adapter (Phantom)
- @magicblock/sdk for Magic Router
- Existing game engine (Canvas JS) - minimal changes

## KEY CONCEPTS

1. **Account Delegation**: Lock account on L1, modify in ER, commit back
2. **Magic Router**: Auto-routes transactions to ER or L1
3. **Gasless in ER**: All gameplay actions are free
4. **L1 Transactions**: Only for revive and end_game

## STATE STRUCTURE

```rust
// PlayerAccount (persists on L1)
pub struct PlayerAccount {
    pub authority: Pubkey,
    pub owned_characters: Vec<String>,
    pub revives: u8,
    pub total_gold: u64,
    pub best_time: u32,
    pub best_wave: u8,
}

// GameSession (delegated to ER during gameplay)
pub struct GameSession {
    pub player: Pubkey,
    pub character_id: String,
    pub hp: u16,
    pub level: u8,
    pub xp: u32,
    pub gold_earned: u32,
    pub time_survived: u32,
    pub wave: u8,
    pub is_active: bool,
}
```

## INSTRUCTIONS TO IMPLEMENT

1. `init_player` - Create PlayerAccount PDA (one-time)
2. `start_game` - Create GameSession + delegate to ER
3. `use_revive` - Decrement revives, restore HP (L1 tx)
4. `end_game` - Commit final state, undelegate, update stats

## CODING GUIDELINES

- Use Anchor 0.29.0 syntax
- All accounts should be PDAs (deterministic)
- Use ephemeral_rollups_sdk::cpi for delegation
- Frontend: TypeScript with strict types
- Keep game engine code (JS) mostly unchanged
- Use Magic Router endpoint for all transactions

## HELPFUL REFERENCES

- MagicBlock Docs: https://docs.magicblock.gg
- Supersize GitHub: https://github.com/Lewarn00/supersize-solana
- Ephemeral Rollups SDK: https://github.com/magicblock-labs/ephemeral-rollups-sdk

When I ask you to implement something:
1. Show complete, working code
2. Include all imports
3. Add comments explaining MagicBlock-specific parts
4. Suggest tests where appropriate
```

---

## EXAMPLE PROMPTS TO USE

### Prompt 1: Setup project
```
Create the initial Anchor project structure for magic-baser-solana. Include:
1. Cargo.toml with correct dependencies (anchor-lang, ephemeral-rollups-sdk)
2. lib.rs with program declaration
3. state.rs with PlayerAccount and GameSession structs
4. errors.rs with custom errors

Make sure to use PDA seeds for both accounts.
```

### Prompt 2: Init Player instruction
```
Implement the init_player instruction that:
1. Creates a PlayerAccount PDA for the wallet
2. Gives them the free character "imelda"
3. Sets initial revives to 0
4. Uses proper Anchor account validation

Include the accounts struct and handler function.
```

### Prompt 3: Start Game with Delegation
```
Implement start_game instruction that:
1. Validates the player owns the character
2. Creates a new GameSession account
3. Initializes with starting stats (100 HP, level 1, etc)
4. Delegates the session account to Ephemeral Rollup using ephemeral_rollups_sdk

Show the delegation CPI call with correct parameters.
```

### Prompt 4: Frontend Wallet Connect
```
Create a React component for Solana wallet connection using @solana/wallet-adapter-react.
Should support:
1. Phantom wallet
2. Display connected address
3. Disconnect button
4. Store connection in context

Use Next.js 14 app router and TypeScript.
```

### Prompt 5: MagicBlock Client
```
Create a TypeScript class MagicBlockClient that:
1. Connects to Magic Router (devnet endpoint)
2. Has method sendTransaction() that uses sendMagicTransaction
3. Has method startGameSession() that calls the program
4. Has method useRevive() 
5. Has method endGame()

Include proper error handling and types.
```

### Prompt 6: Game Integration
```
Show how to integrate the existing Canvas game engine with the Solana backend.
The game should:
1. Call startGameSession() when user clicks Play
2. Update session state in ER during gameplay
3. Call useRevive() when player dies and has revives
4. Call endGame() when player exits or runs out of revives

Keep the game engine code unchanged, just add the blockchain hooks.
```

---

## TROUBLESHOOTING PROMPTS

```
The delegation CPI is failing with "account not owned by program". 
Show me the correct way to set up account ownership for ephemeral rollups.
```

```
Transactions to Magic Router are timing out. 
What's the correct way to handle connection and retry logic?
```

```
How do I test the game locally without deploying to devnet?
Show me how to set up local-test-validator with MagicBlock.
```

---

## WHEN STUCK, ASK:

"Show me a complete working example from Supersize or another MagicBlock game that demonstrates [specific feature]"

"What's the exact CPI call signature for delegate_account in ephemeral-rollups-sdk v0.1?"

"How does Magic Router determine if a transaction should go to ER or L1?"
