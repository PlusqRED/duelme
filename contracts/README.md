# DuelMe Smart Contracts

P2P gaming duel platform — smart contracts for wager escrow and on-chain reputation tracking.

## Architecture

- **DuelMe.sol** — core contract: duel creation, joining, claim/confirm flow, refunds, cancellation, PlayerStats reputation
- **MockUSDT.sol** — testnet ERC20 with public `faucet()` (mints 1000 USDT per call)

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

```bash
cd contracts
forge install
```

## Build

```bash
forge build
```

## Tests

Run all tests:

```bash
forge test
```

With verbose output (show test names):

```bash
forge test -v
```

With detailed traces on failure:

```bash
forge test -vvv
```

Run a specific test:

```bash
forge test --match-test testCreateDuel
```

Run tests matching a pattern:

```bash
forge test --match-test "testRefund*"
```

Gas report:

```bash
forge test --gas-report
```

### Test coverage

77 tests covering:

| Area | Tests |
|---|---|
| createDuel | 8 — happy path, min/zero/large wager, no balance, no approval, ID increment, event |
| joinDuel | 7 — happy path, self-join, wrong states, no approval, event |
| claimVictory | 8 — by creator/opponent, non-participant, wrong states, event |
| admitDefeat | 6 — by creator/opponent, non-participant, wrong states, event |
| confirmResult | 8 — after claim/admit, opponent claims, own claim revert, wrong states, event |
| refund | 8 — after timeout, exact boundary, before timeout, wrong states, double call, event |
| cancelDuel | 7 — happy path, non-creator, wrong states, stats unaffected, event |
| PlayerStats | 4 — zero default, cumulative, independent per player |
| Pausable | 10 — pause/unpause by owner, non-owner reverts, all functions blocked, restore |
| Views | 2 — nonexistent duel, constants |
| Integration | 4 — concurrent duels, full flows, balance integrity |
| Constructor | 2 — valid + zero address |

## Deploy to testnet

1. Copy `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | Deployer wallet private key (without 0x prefix) |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint for Arbitrum Sepolia |
| `ARBISCAN_API_KEY` | Arbiscan API key for contract verification |

2. Get testnet ETH from a [faucet](https://faucets.chain.link/arbitrum-sepolia)

3. Deploy:

```bash
source .env

forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

This deploys MockUSDT + DuelMe and mints 1000 test USDT to the deployer.

4. After deploy, update `DUELME_ADDRESSES` and USDT address in `frontend/src/lib/constants.ts`.

## Duel lifecycle

```
Created → Funded → WinnerClaimed → Resolved
   ↓                    ↓
Cancelled           Refunded (after 1h timeout)
```

1. Creator calls `createDuel(amount)` — deposits USDT, state = Created
2. Opponent calls `joinDuel(duelId)` — deposits matching wager, state = Funded
3. Either player calls `claimVictory()` or `admitDefeat()` — state = WinnerClaimed, 1h timer starts
4. The OTHER player calls `confirmResult()` — winner gets 2x wager, state = Resolved
5. If no confirmation after 1 hour — anyone can call `refund()` — 50/50 split, state = Refunded
6. Creator can `cancelDuel()` before anyone joins — full refund, state = Cancelled

## Reputation (PlayerStats)

- **confirmResult**: both players get `duelsHonored += 1`
- **refund**: claimer gets `duelsHonored += 1`, non-responder gets `duelsAbandoned += 1`
- **cancel**: no stats change

Frontend calculates Wilson Score Lower Bound from (honored, abandoned) for display.
