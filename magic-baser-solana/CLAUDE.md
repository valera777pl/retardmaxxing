# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magic Baser is a Vampire Survivors-style game on Solana using MagicBlock's BOLT ECS framework and Ephemeral Rollups for sub-second latency gameplay.

## Common Commands

### Solana Programs (Rust)
```bash
# Build all BOLT programs
cargo build-sbf --manifest-path programs-ecs/components/player/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/components/game-session/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/components/leaderboard/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/systems/start-game/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/systems/end-game/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/systems/update-stats/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/systems/use-revive/Cargo.toml
cargo build-sbf --manifest-path programs-ecs/systems/submit-score/Cargo.toml

# Run local validator with programs
solana-test-validator --reset \
  --bpf-program WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n tests/fixtures/world.so \
  --bpf-program 6URqfQrK5GTfc9HuyT43B2CLx38ZR4uu9nAhXdDmoy7M target/deploy/player.so \
  --bpf-program 9zbUFw8u3XzzNRA3TDQsGG2AkEuu2AQBXFYPxAZuWhTo target/deploy/game_session.so \
  --bpf-program DsGfKAe1dC62tx3AkwAad2RsvYqNFF69ki73KdemF53P target/deploy/leaderboard.so \
  --bpf-program 5DeWBC5u2mWzZ46pSekwoDvknT18LKZpghY5yzT9iNR1 target/deploy/start_game.so \
  --bpf-program 7FeyB4hz8LCrBYJusgEzKReT9rbgkrqdbB2L6aoMPv88 target/deploy/update_stats.so \
  --bpf-program GwmXPNJE1MWXBgWaMyYZiemEdboAYFceanBZUkEmBA7H target/deploy/use_revive.so \
  --bpf-program 9ytUaZtMR4NGUPTdJbmpbX8hhpmME8muwUGXZVSq8reY target/deploy/end_game.so \
  --bpf-program 6did5KX3mcbi58jUQ85ZtTV5ahCD71pfFSF96cu73g2A target/deploy/submit_score.so

# After validator starts, initialize BOLT registry and world
bolt registry
bolt world && bolt world && bolt world  # Creates World ID 2
```

### Frontend (Next.js)
```bash
cd app
npm install
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

### Testing
```bash
npm test         # Mocha tests
solana airdrop 10 <WALLET_ADDRESS>  # Fund test wallet
```

## Architecture

### BOLT ECS Structure
- **Components** (`programs-ecs/components/`): Data containers
  - `player/` - Persistent player profile (L1)
  - `game-session/` - Ephemeral game state (ER)
  - `leaderboard/` - Persistent scores (L1)

- **Systems** (`programs-ecs/systems/`): Game logic
  - `start-game` - Initialize session, set is_active=true
  - `update-stats` - Sync game state (called every 200ms)
  - `end-game` - Mark session inactive
  - `use-revive` - Consume revive, restore 50% HP
  - `submit-score` - Save to leaderboard

### Frontend Structure
- `app/src/hooks/useGame.ts` - Main game state management hook
- `app/src/game/engine.ts` - Canvas-based 60 FPS game engine
- `app/src/solana/systems.ts` - Transaction builders for each system
- `app/src/solana/constants.ts` - Program IDs and network config

### Data Flow
1. Game engine runs client-side at 60 FPS
2. Every 200ms, `updateLocalState` syncs to ER via `buildUpdateStatsTx`
3. L1 transactions for: init player, start game, end game, revive
4. ER transactions for: update stats (gasless)

### Entity Seeds
All PDAs derived from: `${walletAddress.slice(0, 20)}-{suffix}`
- Player entity: suffix "player"
- Session entity: suffix "session"
- Leaderboard entity: suffix "leaderboard"

## Key Program IDs (Deployed to Devnet)

Components:
- Player: `6URqfQrK5GTfc9HuyT43B2CLx38ZR4uu9nAhXdDmoy7M`
- GameSession: `9zbUFw8u3XzzNRA3TDQsGG2AkEuu2AQBXFYPxAZuWhTo`
- Leaderboard: `DsGfKAe1dC62tx3AkwAad2RsvYqNFF69ki73KdemF53P`

Systems:
- InitPlayer: `GLR24FCjCRLcEJN37gGcZh9KBnKtM4rKRHdAFchNwprj`
- StartGame: `5DeWBC5u2mWzZ46pSekwoDvknT18LKZpghY5yzT9iNR1`
- UpdateStats: `7FeyB4hz8LCrBYJusgEzKReT9rbgkrqdbB2L6aoMPv88`
- UseRevive: `GwmXPNJE1MWXBgWaMyYZiemEdboAYFceanBZUkEmBA7H`
- EndGame: `9ytUaZtMR4NGUPTdJbmpbX8hhpmME8muwUGXZVSq8reY`
- SubmitScore: `6did5KX3mcbi58jUQ85ZtTV5ahCD71pfFSF96cu73g2A`

World Program: `WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n`

## Network Config

Current network: **devnet** (configured in `app/src/solana/constants.ts`)

### Devnet endpoints:
- Solana RPC: `https://api.devnet.solana.com`
- Magic Router: `https://devnet-router.magicblock.app`
- ER HTTP: `https://devnet.magicblock.app`
- ER WebSocket: `wss://devnet.magicblock.app`
- World ID: 2421
- World PDA: `3Z4teSBjiDcFSkvKbaHxY1aTq8b6t9kq6A2TZQJLXYUs`

### Localnet endpoints:
- Solana RPC: `http://localhost:8899`
- Magic Router: `http://localhost:7799`
- World ID: 2

## Switching Networks

To switch between networks, change `NETWORK` in `app/src/solana/constants.ts`:
```typescript
export const NETWORK = "devnet" as const;  // or "localnet"
```

## Important Notes

- BOLT systems use `#[system]` macro from `bolt-lang`
- Systems only access components via `#[system_input]` struct
- Memory-constrained: avoid complex string operations in systems
- Devnet World ID = 2421, Localnet World ID = 2
