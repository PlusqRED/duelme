<p align="center">
  <img src="https://img.shields.io/badge/Arbitrum-Sepolia-blue?style=flat-square&logo=ethereum" alt="Arbitrum Sepolia" />
  <img src="https://img.shields.io/badge/Solidity-0.8.34-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/PlusqRED/69b27e3902f28e6b5fd2495fc2143f18/raw/duelme-coverage.json&style=flat-square" alt="Coverage" />
  <img src="https://github.com/PlusqRED/duelme/actions/workflows/test.yml/badge.svg" alt="CI" />
</p>

<!-- CONTRACT_ADDRESSES:START -->
## Current deployed contracts

_Auto-generated from `contracts/broadcast/Deploy.s.sol/421614/run-latest.json`. Updated by `.githooks/pre-commit`._

| Network | Contract | Address |
|---|---|---|
| Arbitrum Sepolia | `MockUSDT` | `0xff2405132f2c13099a68759d38bb812505e970c0` |
| Arbitrum Sepolia | `DuelMe` | `0xab4d602f74ea2eb31336f163dce5ee7c9983e4b9` |

> Dev note: run `git config core.hooksPath .githooks` once in your clone to auto-refresh this block on every commit.

<!-- CONTRACT_ADDRESSES:END -->

# DuelMe

Peer-to-peer gaming duel platform with USDT wagers and on-chain reputation.

Two players stake equal USDT amounts on a match. The winner earns the full pot through a claim-based payout flow. Every outcome is recorded on-chain, building a tamper-proof reputation score for each player.

## How it works

```
Creator deposits USDT + gets private invite link ──► Opponent opens full link and matches wager ──► Play the game off-chain
                                                                                                          │
                                 ┌────────────────────────────────────────────────────────────────────────┘
                                 ▼
                         Player submits result
                                 │
                   ┌─────────────┼─────────────┐
                   ▼             ▼             ▼
             Opponent confirms  Opponent disputes  No response (1h)
                    │             │             │
                    ▼             ▼             ▼
          Winner can claim 2× pot  Both can claim 50/50  Both can claim 50/50
            Both get +honored         No rep change        Claimer +honored
                                                         Ghost +abandoned
```

## Tech stack

| Layer | Stack |
|---|---|
| Smart contracts | Solidity 0.8.34, Foundry, OpenZeppelin |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Wallet | Privy (embedded + external wallets), wagmi, viem |
| Chain | Arbitrum Sepolia (testnet) |
| Token | USDT (MockUSDT on testnet with public faucet) |
| CI | GitHub Actions — forge tests on every push |

## Project structure

```
duelme/
├── contracts/              # Foundry project
│   ├── src/
│   │   ├── DuelMe.sol      # Core contract: duels, escrow, reputation
│   │   └── MockUSDT.sol    # Testnet ERC20 with faucet
│   ├── test/
│   │   ├── DuelMe.t.sol         # Main lifecycle and reputation suite
│   │   └── DuelMePayouts.t.sol  # Claim, timestamps, and mutual-cancel coverage
│   └── script/
│       └── Deploy.s.sol    # Deploys MockUSDT + DuelMe
│
├── frontend/               # Next.js app
│   └── src/
│       ├── app/            # Pages: home, dashboard, create duel, duel detail
│       ├── components/     # UI, duel, layout, wallet components
│       ├── hooks/          # useDuel, useDuelActions, useReputation
│       ├── lib/            # contracts ABI, wagmi config, constants
│       └── i18n/           # EN/RU translations
│
└── .github/workflows/      # CI pipeline
```

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

### Contracts

```bash
cd contracts
forge install
forge build
forge test -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Smart contract

### Duel lifecycle

| State | Transition | Who |
|---|---|---|
| **Created** | `createDuel(amount, inviteHash)` or `createDuel(amount, inviteHash, message)` — creator deposits USDT, adds an optional challenge note, and shares a private invite link | Anyone |
| **Funded** | `joinDuel(duelId, inviteSecret)` — invited opponent matches wager | Any other wallet with the invite secret |
| **Declined** | `declineDuel(duelId, inviteSecret)` — invited opponent declines, creator gets a claimable refund | Any other wallet with the invite secret |
| **MutualCancelRequested** | `requestMutualCancellation(duelId)` — funded duel is paused while the other player reviews the request | Either participant |
| **Funded** | `declineMutualCancellation(duelId)` or `withdrawMutualCancellationRequest(duelId)` — duel resumes | The other participant / requester |
| **MutuallyCancelled** | `acceptMutualCancellation(duelId)` — both players get full claimable refunds and no reputation change | The other participant |
| **WinnerClaimed** | `claimVictory(duelId)` or `admitDefeat(duelId)` | Either participant |
| **Resolved** | `confirmResult(duelId)` — winner payout becomes claimable | The other participant |
| **Disputed** | `disputeResult(duelId)` — both refunds become claimable immediately when the other participant disagrees | The other participant |
| **Refunded** | `refund(duelId)` — 50/50 split becomes claimable after 1h timeout | Anyone |
| **Cancelled** | `cancelDuel(duelId)` — full refund becomes claimable before join | Creator only |

After any claimable terminal outcome, players withdraw funds with `claimPayout(duelId)` or batch with `claimPayouts(duelIds)`.

### Reputation (PlayerStats)

Every wallet accumulates `duelsHonored` and `duelsAbandoned` counters on-chain:

- **confirmResult** — both players get `+1 honored`
- **disputeResult** — no stats change
- **refund** — claimer gets `+1 honored`, non-responder gets `+1 abandoned`
- **cancel / decline / mutual cancel** — no stats change

The frontend calculates a **Wilson Score Lower Bound** from these counters for display.

### Security

- OpenZeppelin `ReentrancyGuard` on all token-moving functions
- `Pausable` with owner-only `pause()`/`unpause()` for emergencies
- `SafeERC20` for all token transfers
- Pull-based payouts prevent USDT push-transfer lockups and let players claim later from completed duels
- Invite links use a high-entropy secret stored on-chain only as a hash; knowing the duel id alone is not enough to join or decline
- Optional challenge messages are UTF-8 validated on-chain and capped at 32 code points / 128 bytes
- Minimum wager of 3 USDT to prevent dust spam
- Emergency USDT withdrawal is timelocked by 30 days; non-USDT rescue remains owner-only and immediate

## Deploy to testnet

```bash
cd contracts
cp .env.example .env
# Fill in PRIVATE_KEY, ARBITRUM_SEPOLIA_RPC_URL, ARBISCAN_API_KEY

set -a && . ./.env && set +a
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

After deploy:

1. keep `contracts/broadcast/Deploy.s.sol/421614/run-latest.json` tracked as the source of truth,
2. update `frontend/src/lib/constants.ts`,
3. run `python3 scripts/sync_readme_contract_addresses.py` (or let `.githooks/pre-commit` do it automatically).

## License

MIT
