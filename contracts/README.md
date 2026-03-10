<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.34-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Foundry-forge-orange?style=flat-square" alt="Foundry" />
  <img src="https://img.shields.io/badge/OpenZeppelin-5.6.1-4E5EE4?style=flat-square" alt="OpenZeppelin" />
</p>

# DuelMe — Smart Contracts

Wager escrow and on-chain reputation tracking for P2P gaming duels.

## Contracts

| Contract | Description |
|---|---|
| `DuelMe.sol` | Core contract — duel creation, joining, claim/confirm flow, refunds, cancellation, PlayerStats reputation |
| `MockUSDT.sol` | Testnet ERC20 with 6 decimals and public `faucet()` (mints 1000 USDT per call) |

## Prerequisites

[Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil):

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

```bash
forge install
forge build
```

## Tests

```bash
forge test          # Run all tests
forge test -v       # Verbose — show test names
forge test -vvv     # Detailed traces on failure
forge test --gas-report   # Gas usage report
```

Run specific tests:

```bash
forge test --match-test testCreateDuel
forge test --match-test "testRefund*"
```

### Coverage — 77 tests

| Area | Count | What's covered |
|---|---|---|
| createDuel | 8 | Happy path, min/zero/large wager, no balance, no approval, ID increment, event |
| joinDuel | 7 | Happy path, self-join, wrong states, no approval, event |
| claimVictory | 8 | By creator/opponent, non-participant, wrong states, event |
| admitDefeat | 6 | By creator/opponent, non-participant, wrong states, event |
| confirmResult | 8 | After claim/admit, opponent claims, own claim revert, wrong states, event |
| refund | 8 | After timeout, exact boundary, before timeout, wrong states, double call, event |
| cancelDuel | 7 | Happy path, non-creator, wrong states, stats unaffected, event |
| PlayerStats | 4 | Zero default, cumulative, independent per player |
| Pausable | 10 | Pause/unpause by owner, non-owner reverts, all functions blocked, restore |
| Views | 2 | Nonexistent duel, constants |
| Integration | 4 | Concurrent duels, full flows, balance integrity |
| Constructor | 2 | Valid + zero address |

## Duel lifecycle

```
Created ──► Funded ──► WinnerClaimed ──► Resolved
  │                         │
  ▼                         ▼
Cancelled              Refunded (after 1h)
```

| Step | Function | Description |
|---|---|---|
| 1 | `createDuel(amount)` | Creator deposits USDT, state = Created |
| 2 | `joinDuel(duelId)` | Opponent matches wager, state = Funded |
| 3 | `claimVictory(duelId)` / `admitDefeat(duelId)` | Either participant, state = WinnerClaimed, 1h timer starts |
| 4 | `confirmResult(duelId)` | Other participant confirms — winner gets 2x pot, state = Resolved |
| 5 | `refund(duelId)` | After 1h timeout — 50/50 split, state = Refunded |
| 6 | `cancelDuel(duelId)` | Creator cancels before join — full refund, state = Cancelled |

## Reputation (PlayerStats)

On-chain counters per wallet: `duelsHonored` and `duelsAbandoned`.

| Outcome | Honored | Abandoned |
|---|---|---|
| `confirmResult` | Both players +1 | — |
| `refund` | Claimer +1 | Non-responder +1 |
| `cancelDuel` | — | — |

## Security

- **ReentrancyGuard** on all token-moving functions
- **Pausable** with owner-only `pause()`/`unpause()`
- **SafeERC20** for all transfers
- **MIN_WAGER = 3 USDT** to prevent dust spam
- No admin withdrawal — funds only move through duel resolution

## Deploy to testnet

```bash
cp .env.example .env
# Fill in your values
```

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | Deployer wallet private key (without 0x prefix) |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint for Arbitrum Sepolia |
| `ARBISCAN_API_KEY` | Arbiscan API key for contract verification |

Get testnet ETH from a [faucet](https://faucets.chain.link/arbitrum-sepolia), then:

```bash
source .env

forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

Deploys MockUSDT + DuelMe and mints 1000 test USDT to the deployer.

After deploy, update addresses in `frontend/src/lib/constants.ts`.
