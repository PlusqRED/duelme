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
| `DuelMe.sol` | Core contract — secure invite duels, claim-based payouts, mutual cancellation, timestamps, and PlayerStats reputation |
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

### Current test coverage — 107 tests

| Suite | Focus | Count |
|---|---|---|
| `test/DuelMe.t.sol` | Core lifecycle, invite security, reputation, pausable behavior, UTF-8 messages | 95 |
| `test/DuelMePayouts.t.sol` | Claim payouts, lifecycle timestamps, mutual cancellation, batch claims | 12 |

Run the full suite with:

```bash
forge test
```

## Duel lifecycle

```
Created ──► Funded ──► WinnerClaimed ──► Resolved
  │           │              │
  │           │              ├────► Disputed
  │           │              └────► Refunded (after 1h timeout)
  │           └────► MutualCancelRequested ──► Funded
  │                                              └────► MutuallyCancelled
  ├────► Cancelled
  └────► Declined
```

| Step | Function | Description |
|---|---|---|
| 1 | `createDuel(amount, inviteHash)` / `createDuel(amount, inviteHash, message)` | Creator deposits USDT, stores only the invite hash on-chain, optionally adds a short UTF-8 message |
| 2 | `joinDuel(duelId, inviteSecret)` | Invited opponent matches the wager, state = Funded |
| 3 | `declineDuel(duelId, inviteSecret)` | Invited opponent declines, state = Declined, creator refund becomes claimable |
| 4 | `requestMutualCancellation(duelId)` | Either funded participant pauses the duel and asks to cancel it by agreement |
| 5 | `acceptMutualCancellation(duelId)` | Other participant accepts, state = MutuallyCancelled, both refunds become claimable |
| 6 | `declineMutualCancellation(duelId)` / `withdrawMutualCancellationRequest(duelId)` | Duel resumes in `Funded` |
| 7 | `claimVictory(duelId)` / `admitDefeat(duelId)` | Either participant submits the result, state = WinnerClaimed, 1h timer starts |
| 8 | `confirmResult(duelId)` | Other participant confirms, state = Resolved, winner payout becomes claimable |
| 9 | `disputeResult(duelId)` | Other participant disputes, state = Disputed, both refunds become claimable |
| 10 | `refund(duelId)` | After 1h timeout, state = Refunded, both 50/50 refunds become claimable |
| 11 | `cancelDuel(duelId)` | Creator cancels before join, state = Cancelled, creator refund becomes claimable |
| 12 | `claimPayout(duelId)` / `claimPayouts(duelIds)` | Withdraw claimable winnings or refunds from terminal outcomes |

## Reputation (PlayerStats)

On-chain counters per wallet: `duelsHonored` and `duelsAbandoned`.

| Outcome | Honored | Abandoned |
|---|---|---|
| `confirmResult` | Both players +1 | — |
| `refund` | Claimer +1 | Non-responder +1 |
| `cancelDuel` / `declineDuel` / `acceptMutualCancellation` / `disputeResult` | — | — |

## Security

- **ReentrancyGuard** on all token-moving functions
- **Pausable** with owner-only `pause()`/`unpause()`
- **SafeERC20** for all transfers
- **Claim-based payouts** to avoid risky push-payment behavior with USDT-like tokens
- **Invite hash model** so the duel id alone is not enough to join or decline
- **UTF-8 message validation** capped at 32 code points / 128 bytes
- **MIN_WAGER = 3 USDT** to prevent dust spam
- **Timelocked emergency USDT withdrawal** (`30 days`) plus immediate rescue for non-USDT tokens

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
set -a && . ./.env && set +a

forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

Deploys MockUSDT + DuelMe and mints 1000 test USDT to the deployer.

After deploy:

1. keep `broadcast/Deploy.s.sol/421614/run-latest.json` as the tracked artifact,
2. update `frontend/src/lib/constants.ts`,
3. sync the root `README.md` contract block with `python3 ../scripts/sync_readme_contract_addresses.py` (or use the configured git hook).
