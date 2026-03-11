---
name: sync-abi
description: Sync frontend ABI with compiled contract. Use after changing DuelMe.sol to keep frontend in sync.
allowed-tools: Bash, Read, Write, Glob
---

Rebuild contracts and sync the ABI to the frontend.

## Steps

1. Run `cd contracts/ && forge build` — ensure clean compilation
2. Read the compiled ABI from `contracts/out/DuelMe.sol/DuelMe.json` (the `abi` field)
3. Read `frontend/src/lib/contracts.ts`
4. Compare the compiled ABI with the existing `duelMeAbi` in contracts.ts
5. If there are differences:
   - Update `duelMeAbi` to match the compiled output
   - Keep the existing TypeScript formatting style (array of objects with `as const`)
   - Include all functions (read + write) and events
   - Do NOT include constructor, receive, or fallback
   - Update the `Duel` interface if the struct changed
   - Update `DuelState` enum if states changed
6. Report what changed (new functions, removed functions, modified signatures)
7. Run `cd frontend/ && npx tsc --noEmit` to verify no type errors
