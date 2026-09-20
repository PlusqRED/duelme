---
name: deploy
description: Deploy or re-deploy DuelMe contracts to a specified network. Use when asked to deploy contracts.
allowed-tools: Bash, Read, Edit, Grep, Glob
---

Deploy DuelMe smart contracts to the specified network.

Arguments: $ARGUMENTS (network name: "sepolia", "arbitrum". Default: "sepolia")

Two scripts, and they are not interchangeable:

| Argument | Chain | Script | What it deploys |
|---|---|---|---|
| `sepolia` | Arbitrum Sepolia (421614) | `contracts/script/Deploy.s.sol` | ERC2771Forwarder + **MockUSDT** + DuelMe, mints 1000 test USDT |
| `arbitrum` | Arbitrum One (42161) | `contracts/script/DeployMainnet.s.sol` | ERC2771Forwarder + DuelMe against the existing USDT at `$USDT_ADDRESS` |

`Deploy.s.sol` redeploys MockUSDT every time, so a Sepolia deploy changes the wager token
address too — that is what most of the follow-up below is for.

## Steps

1. `cd contracts/` and `forge build`.
2. `forge test`. If anything fails — STOP and report. Never deploy off a red suite.
3. Read the script you are about to run and confirm its required env. Both need `PRIVATE_KEY`;
   `DeployMainnet.s.sol` also needs `USDT_ADDRESS` (it reverts unless the address has code and
   answers `nonces()`, because the gasless flow has no approve fallback) and honours
   `EXPECTED_CHAIN_ID` (default 42161) as a wrong-RPC guard.
4. Load the env: `cd contracts && set -a && . ./.env && set +a`.
5. Show the user the exact command and **ask for confirmation before broadcasting**:
   ```bash
   forge script script/Deploy.s.sol \
     --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast --verify \
     --etherscan-api-key $ARBISCAN_API_KEY
   ```
   (mainnet: `script/DeployMainnet.s.sol` with `$ARBITRUM_RPC_URL`.)
6. Read the new addresses out of
   `contracts/broadcast/<script>/<chainId>/run-latest.json` — the tracked artifact is the source
   of truth, not the console output.
7. Mirror them by hand into `frontend/src/lib/constants.ts`, **in the `SUPPORTED_CHAINS` entry for
   that chain**: `duelMe`, `forwarder`, and on Sepolia `usdt` as well. `DUELME_ADDRESSES`,
   `FORWARDER_ADDRESSES`, `USDT_ADDRESSES` and `CHAIN_NAMES` are derived from that object — do not
   edit them, and never inline an address anywhere else.
8. Sepolia only: update `duelme.faucet.mock-usdt-address` in
   `backend/src/main/resources/application.yml`, or the faucet keeps handing testers the previous
   MockUSDT. It is a literal with no env override on purpose. **Keep the quotes** — a bare `0x…`
   parses as a hex integer and `FaucetService` then refuses to start.
9. Sync the README contract block: `python3 scripts/sync_readme_contract_addresses.py` from the
   repo root (the pre-commit hook runs it too). Never hand-edit that block.
10. Verify the mirrors: `cd frontend && npm test` — `deployedAddresses.test.ts` and
    `contractAddresses.test.ts` fail the build on exactly the drift this step introduces.
11. Report the deployed addresses, the explorer links, and anything from steps 8–9 the user still
    has to do outside the repo.
