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

_Auto-generated from `contracts/broadcast/Deploy.s.sol/421614/run-latest.json`. Updated by `.githooks/pre-commit`._

| Network | Contract | Address |
|---|---|---|
| Arbitrum Sepolia | `MockUSDT` | `0xff2405132f2c13099a68759d38bb812505e970c0` |
| Arbitrum Sepolia | `DuelMe` | `0xab4d602f74ea2eb31336f163dce5ee7c9983e4b9` |

> Dev note: run `git config core.hooksPath .githooks` once in your clone to auto-refresh this block on every commit.

<!-- CONTRACT_ADDRESSES:END -->

# DuelMe

P2P gaming duel platform — players wager USDT in 1v1 duels via smart contracts. Zero fees, honor-based result reporting with on-chain reputation.

## How it works

```
Creator deposits USDT → shares private invite link → Opponent matches wager → Play off-chain
                                                                                     │
                                                                    Player submits result
                                                                             │
                                                          ┌──────────────────┼──────────────────┐
                                                          ▼                  ▼                  ▼
                                                    Confirmed           Disputed          No response (1h)
                                                    Winner claims 2×    50/50 refund      50/50 refund
                                                    Both +honored       No rep change     Ghost +abandoned
```

## Tech stack

| Layer | Stack |
|---|---|
| Contracts | Solidity 0.8.34, Foundry, OpenZeppelin |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Java 25, Spring Boot 4, MongoDB, GraalVM Native Image |
| Auth | Privy (embedded + external wallets), wagmi, viem |
| Infra | Docker, GHCR, Caddy, GitHub Actions |

## Project structure

```
contracts/    Solidity smart contracts (Foundry)
frontend/     Next.js web app (App Router)
backend/      Java 25 + Spring Boot 4 API (Gradle)
ops/          Docker Compose, Caddy configs
```

## Quick start

```bash
# Contracts
cd contracts && forge install && forge test -v

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

## License

MIT
