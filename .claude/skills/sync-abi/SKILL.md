---
name: sync-abi
description: Sync frontend ABI with compiled contract. Use after changing DuelMe.sol to keep frontend in sync.
allowed-tools: Bash, Read, Edit, Write, Glob
---

Rebuild contracts and sync the ABI to the frontend.

`duelMeAbi` in `frontend/src/lib/contracts.ts` is a hand-made mirror of the compiled artifact, and
a wrong entry does not fail to compile — it encodes a selector that does not exist. So the target
is not "close enough to type-check": `frontend/src/lib/__tests__/contractMirrors.test.ts` compares
the two arrays canonicalised, **entry for entry**, and fails on anything dropped or reworded.

## Steps

1. `cd contracts/ && forge build` — ensure clean compilation.
2. Read the `abi` field of `contracts/out/DuelMe.sol/DuelMe.json`.
3. Read `frontend/src/lib/contracts.ts`.
4. Diff it against the existing `duelMeAbi`.
5. If there are differences, update `duelMeAbi` to match the compiled output:
   - Include **every** entry, `constructor` included, with `inputs`, `outputs`, `components`,
     `internalType` and each event input's `indexed` flag intact. The mirror test compares nested
     fields; dropping `internalType` on a tuple member fails it.
   - `inputs` / `outputs` / `components` are positional — keep their order.
   - Keep the existing TypeScript formatting (array of objects, `as const` at the end).
   - Update the `DuelState` enum if the contract's enum changed, and the `Duel` interface if
     `DuelView` gained, lost or renamed a field.
6. Report what changed (new functions, removed functions, modified signatures).
7. Verify from `frontend/`:
   - `npm test` — this is the check that matters; `contractMirrors.test.ts` skips when
     `contracts/out/` is missing, so step 1 has to have run.
   - `npx tsc --noEmit` — catches the callers the shape change broke.
