<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.34-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Java-25-ed8b00?style=flat-square&logo=openjdk&logoColor=white" alt="Java 25" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.0-6db33f?style=flat-square&logo=springboot&logoColor=white" alt="Spring Boot 4" />
  <img src="https://img.shields.io/badge/MongoDB-8.2-47a248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB 8.2" />
  <img src="https://img.shields.io/badge/GraalVM-Native-e76f00?style=flat-square&logo=oracle&logoColor=white" alt="GraalVM Native" />
  <img src="https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/PlusqRED/69b27e3902f28e6b5fd2495fc2143f18/raw/duelme-coverage.json&style=flat-square" alt="Coverage" />
  <img src="https://github.com/PlusqRED/duelme/actions/workflows/ci.yml/badge.svg" alt="CI" />
</p>

<!-- CONTRACT_ADDRESSES:START -->
## Current deployed contracts

_Auto-generated from `contracts/broadcast/DeployMainnet.s.sol/42161/run-latest.json`, `contracts/broadcast/Deploy.s.sol/421614/run-latest.json`. Updated by `.githooks/pre-commit`._

| Network | Contract | Address |
|---|---|---|
| Arbitrum One | `ERC2771Forwarder` | `0x830d99b25a2c9103501de19de7a7ee4525c619ab` |
| Arbitrum One | `DuelMe` | `0x32b3c9af55c7c784bdf9128a1f681a66a37bd261` |
| Arbitrum Sepolia | `ERC2771Forwarder` | `0xbd9c168fd94be86771b7a3fcafe3e21526b0efaa` |
| Arbitrum Sepolia | `MockUSDT` | `0x44d213d601c19ec98bf61a1bca3935d6da07f05d` |
| Arbitrum Sepolia | `DuelMe` | `0x588a54fa8c00c8ac003e41bd8ee26fbc8994105f` |

> Dev note: run `git config core.hooksPath .githooks` once in your clone to auto-refresh this block on every commit.

<!-- CONTRACT_ADDRESSES:END -->

# DuelMe

P2P gaming duel platform — players wager USDT in 1v1 duels via smart contracts. Zero fees, honor-based result reporting with on-chain reputation.

## How it works

```
Creator stakes USDT ──► Opponent matches it ──► They play, off-chain ──► Someone reports
                                                                              │
                                                                     the duel settles
```

A duel is opened one of three ways: a private invite link, an address it is addressed to, or open
to whoever joins first. How it ends:

| Ending | Who can trigger it | Result | Reputation |
|---|---|---|---|
| Win confirmed | Loser confirms the claim | Winner takes 2× | Both +honored |
| Concession | Loser concedes — settles at once | Winner takes 2× | Both +honored |
| Dispute | The other player rejects the claim | 50/50 back | unchanged |
| No response | Anyone, after the claim window (1h) | 50/50 back | Claimer +honored, silent one +abandoned |
| Mutual cancel | Both players agree | Each takes their own stake back | unchanged |
| Cancel / decline | Creator, or the invitee, before it is funded | Creator's stake back | unchanged |

Nothing is ever pushed: every ending makes a balance *claimable* and the player withdraws it, so a
token that blocks an address cannot strand the other player's money. The claim window is an
on-chain parameter, not a constant.

## Tech stack

| Layer | Stack |
|---|---|
| Contracts | Solidity 0.8.34, Foundry, OpenZeppelin |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Java 25, Spring Boot 4, MongoDB, GraalVM Native Image |
| Auth | Privy (embedded + external wallets), wagmi, viem |
| Gasless | ERC-2771 meta-transactions + EIP-2612 permit — players need no ETH |
| Infra | Docker, GHCR, Caddy, GitHub Actions |

## Project structure

| Directory | Description | Docs |
|---|---|---|
| [`contracts/`](contracts/) | Solidity smart contracts — duels, escrow, reputation | [README](contracts/README.md) |
| [`frontend/`](frontend/) | Next.js web app — profiles, duels, dashboard | [README](frontend/README.md) |
| [`backend/`](backend/) | Java 25 + Spring Boot 4 API — profiles, games, duel metadata | [README](backend/README.md) |
| [`ops/`](ops/) | Docker Compose stacks and Caddy configs | [INFRASTRUCTURE](ops/INFRASTRUCTURE.md) |
| [`ton/`](ton/) | TON mini-app spike, separate from the EVM app | [README](ton/README.md) |

## Quick start

```bash
# Contracts
cd contracts && forge install && forge test

# Frontend
cd frontend && npm install && npm run dev    # localhost:3000

# Backend
cd backend && docker compose up -d && ./gradlew bootRun --args='--spring.profiles.active=dev'
```

## API docs

| Environment | Swagger UI | OpenAPI JSON |
|---|---|---|
| Dev | https://dev.duelme.pro/api/v1/swagger-ui | https://dev.duelme.pro/api/v1/docs |
| Prod | https://duelme.pro/api/v1/swagger-ui | https://duelme.pro/api/v1/docs |

## CI/CD

| Branch | Domain | Image tags |
|---|---|---|
| `dev` | dev.duelme.pro | `:dev` |
| `main` | duelme.pro | `:latest` |

Push to branch → tests → Docker build → GHCR → SSH deploy → health check.

`main` additionally needs the GraalVM native image to build: a change can pass the JVM tests and
still break production, so `build-prod` will not run without a green `backend-native`.

## License

MIT
