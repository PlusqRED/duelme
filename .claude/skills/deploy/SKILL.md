---
name: deploy
description: Deploy or re-deploy DuelMe contracts to a specified network. Use when asked to deploy contracts.
allowed-tools: Bash, Read, Grep, Glob
---

Deploy DuelMe smart contracts to the specified network.

Arguments: $ARGUMENTS (network name: "sepolia", "arbitrum", "polygon". Default: "sepolia")

## Steps

1. Run `forge build` in `contracts/` to ensure compilation passes
2. Run `forge test` to ensure all tests pass. If any fail — STOP and report
3. Read `contracts/script/Deploy.s.sol` to understand deployment params
4. Determine the correct RPC URL and chain config based on the network argument:
   - `sepolia` → Arbitrum Sepolia (chainId 421614)
   - `arbitrum` → Arbitrum One (chainId 42161)
   - `polygon` → Polygon (chainId 137)
5. Show the user the exact deploy command and ASK FOR CONFIRMATION before running
6. After deployment, extract the deployed contract address from output
7. Update `frontend/src/lib/constants.ts` DUELME_ADDRESSES with the new address
8. Report the deployed address and explorer link
