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
| `MockUSDT.sol` | Testnet ERC20 with 6 decimals and public `faucet()` (mints 1000 USDT per call). Implements EIP-2612 `permit`, and deliberately mirrors mainnet USD₮0's quirks — the name `USD₮0` (U+20AE) and a reverting `eip712Domain()` — so a client that builds the permit domain wrongly fails on testnet rather than in production |
| `ERC2771Forwarder` | OpenZeppelin, deployed unmodified. The single forwarder `DuelMe` trusts; its EIP-712 domain name lives in `script/ForwarderConfig.sol` |

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

### Current test coverage — 289 tests (plus 5 fork tests)

| Suite | Focus | Count |
|---|---|---|
| `test/DuelMe.t.sol` | Core lifecycle, invite security, reputation, pause behaviour, UTF-8 messages, state numbering | 113 |
| `test/DuelMeEmergency.t.sol` | Timelocked emergency withdrawal, token and ETH rescue | 40 |
| `test/DuelMeMetaTx.t.sol` | ERC-2771 relaying: sender resolution, what is and is not relayable | 29 |
| `test/DuelMeAdminConfig.t.sol` | Owner-adjustable params, creation pause, two-step ownership | 27 |
| `test/DuelMePermit.t.sol` | EIP-2612 funding, permit front-running | 22 |
| `test/DuelMeInvites.t.sol` | Open duels, address-bound duels, ids that name no duel, invite binding and its golden vector | 19 |
| `test/DuelMePayouts.t.sol` | Claim payouts, claiming to another address, batch claims | 17 |
| `test/DuelMeViews.t.sol` | Batch reads, player record, derived payouts | 11 |
| `test/DuelMeTokenSafety.t.sol` | The deploy-time fee-on-transfer probe, and what the contract does without it | 7 |
| `test/DuelMeInvariant.t.sol` | Solvency under random sequences, nothing written past `duelCount`, plus the handler's own lifecycle smoke test | 4 |
| `test/UsdtPermitFork.t.sol` | Real USD₮0 on Arbitrum One — skipped without `ARBITRUM_RPC_URL` | 5 |

Suites share `test/helpers/`: `DuelMeFixture` (token + forwarder + contract, alice and bob funded
and approved, and the common duel helpers), `MetaTxSigner` for the suites that need signing keys,
and `DuelMeTestConstants` for the values both bases start from. A suite calls `_deployFixture()`
from `setUp` rather than building its own world.

The invariant run is set to `runs = 256, depth = 256` in `foundry.toml` — 65,536 calls, about 25
seconds. It was an eighth of that until the mainnet deploy; the contract is immutable and holds
other people's money, so the search budget is worth the CI minute.

## Duel lifecycle

```
Nonexistent ──► Created ──► Funded ──► WinnerClaimed ──► Resolved
(no such id)      │           │              │
                  │           │              ├────► Disputed
                  │           │              └────► Refunded (after 1h timeout)
                  │           ├────► Resolved (admitDefeat — no confirmation round)
                  │           └────► MutualCancelRequested ──► Funded
                  │                                              └────► MutuallyCancelled
                  ├────► Cancelled
                  └────► Declined
```

`Nonexistent` is the enum's zero value on purpose: duels live in a mapping, so an id that was
never created reads back as a zeroed struct, and it must not pass for one waiting for an opponent.

| Step | Function | Description |
|---|---|---|
| 1 | `createDuel(amount, inviteHash[, message])` / `createDuelFor(amount, inviteHash, invitedOpponent, message)` | Creator deposits USDT and stores only the invite hash. `inviteHash == bytes32(0)` makes the duel open to anyone; a non-zero `invitedOpponent` restricts it to one address. Needs a prior `approve` |
| 1a | `createDuelWithPermit(…)` / `createDuelForWithPermit(…)` | Same, funded by an EIP-2612 signature instead of a separate `approve` transaction |
| 2 | `joinDuel(duelId, inviteSecret)` | Opponent matches the wager, state = Funded. The secret is ignored for an open duel |
| 2a | `joinDuelWithPermit(duelId, inviteSecret, deadline, v, r, s)` | Same, funded by an EIP-2612 signature |
| 3 | `declineDuel(duelId, inviteSecret)` | Invited opponent declines, state = Declined, creator refund becomes claimable. Refused only for a duel that is open in both senses (no hash and no `invitedOpponent`) — its invite is public, so anyone could otherwise end it |
| 4 | `requestMutualCancellation(duelId)` | Either funded participant pauses the duel and asks to cancel it by agreement |
| 5 | `acceptMutualCancellation(duelId)` | Other participant accepts, state = MutuallyCancelled, both refunds become claimable |
| 6 | `declineMutualCancellation(duelId)` / `withdrawMutualCancellationRequest(duelId)` | Duel resumes in `Funded` |
| 7 | `claimVictory(duelId)` | Participant claims the win, state = WinnerClaimed, 1h timer starts |
| 7a | `admitDefeat(duelId)` | Participant concedes — state = Resolved immediately. A statement against your own interest needs no confirmation |
| 8 | `confirmResult(duelId)` | Other participant confirms a claim, state = Resolved, winner payout becomes claimable |
| 9 | `disputeResult(duelId)` | Other participant disputes, state = Disputed, both refunds become claimable |
| 10 | `refund(duelId)` | After 1h timeout, state = Refunded, both 50/50 refunds become claimable |
| 11 | `cancelDuel(duelId)` | Creator cancels before join, state = Cancelled, creator refund becomes claimable |
| 12 | `claimPayout(duelId)` / `claimPayouts(duelIds)` / `refundAndClaimPayouts(duelIds)`, each with a `*To(…, address to)` sibling | Withdraw claimable winnings or refunds. The `*To` variants matter when the token blacklists the claimant's address, and let a player bank winnings elsewhere |
| — | `getDuels(offset, limit)` / `getDuelsByIds(ids)` | Batch reads for listing screens, so a client never issues one call per duel |

## Reputation (PlayerStats)

Five counters per wallet in a single storage slot: `duelsHonored`, `duelsAbandoned`, `duelsWon`,
`duelsLost` and `volume` (the player's own stake across duels that reached a result).

| Outcome | Honored | Abandoned | Won / Lost | Volume |
|---|---|---|---|---|
| `confirmResult` / `admitDefeat` | Both players +1 | — | Winner +1 won, loser +1 lost | Both + wager |
| `refund` (claim timed out) | Claimer +1 | Non-responder +1 | — | Both + wager |
| `cancelDuel` / `declineDuel` / `acceptMutualCancellation` / `disputeResult` | — | — | — | — |

## Security

- **ReentrancyGuard** on all token-moving functions
- **Pausable** with owner-only `pause()`/`unpause()`. It stops the contract taking new money and
  stops a new result being declared; settling a result that already exists (`confirmResult`,
  `disputeResult`, `refund`), cancelling, and every claim stay open. The brake cannot hold money a
  player has already won, and cannot turn a pending win into a refund by running out its clock
  The cost of that choice: while paused, a `Funded` duel has no *unilateral* exit, since both
  `claimVictory` and `admitDefeat` are pausable and `refund` needs `WinnerClaimed`. Two wagers stay
  escrowed until the pause lifts or both players agree to cancel
- **`setDuelCreationPaused(bool)`** as the migration switch: no new duels, everything already on the
  board plays out and pays out
- **Two-step ownership** (`Ownable2Step`), with `_checkOwner` and `acceptOwnership` pinned to
  `msg.sender` so no owner action can be relayed through the forwarder
- **SafeERC20** for all transfers. Whether the wager token takes a cut of a transfer is asked
  once, at deploy, by `script/TokenFeeProbe.sol` — the token is `immutable`, so it is one question
  about one address rather than two `balanceOf` calls on every wager for the life of the contract.
  A fee switched on *after* deploy is not refused on-chain; the response to that is `pause()`,
  which stops duels being entered while every payout and refund stays open
- **Claim-based payouts**, derived from the terminal state rather than stored, so state and payout
  cannot disagree
- **A duel id only names a duel once `createDuel` has issued it.** `Nonexistent`, not `Created`,
  holds the zero value of `DuelState`, so `duels[id]` past `duelCount` reads back as no duel at
  all. While `Created` held zero such a slot read back as a real, fully open duel and `joinDuel`
  admitted anyone on it; `_requireWaitingDuel` is now the single preamble on every path whose
  required state is `Created`. Never give `Created` the zero value again
- **Invite hash bound to this contract and chain** (`keccak256(abi.encode(address(this), chainid, secret))`),
  so an invite cannot be replayed against another deployment. `bytes32(0)` means no secret is
  needed; a duel with neither a secret nor an `invitedOpponent` is open to all and cannot be declined
- **UTF-8 message validation** capped at 32 code points / 128 bytes
- **`MIN_WAGER_FLOOR` = 0.1 USDT**, with the deploy scripts setting `minWager` to 0.3 USDT
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
  --retries 20 --delay 15
```

`--retries 20 --delay 15` is not optional padding. Arbiscan parks a submission in a queue that
regularly outlives forge's default of 5 tries, and forge then exits non-zero on a deploy that
already went through — leaving a live but unverified contract. The key comes from the
`[etherscan]` block in `foundry.toml`, so it no longer needs a flag.

Deploys ERC2771Forwarder + MockUSDT + DuelMe and mints 1000 test USDT to the deployer.

After deploy:

1. keep `broadcast/Deploy.s.sol/421614/run-latest.json` as the tracked artifact,
2. update `SUPPORTED_CHAINS.arbitrumSepolia` in `frontend/src/lib/constants.ts` — `duelMe`,
   `forwarder` **and** `usdt`, since MockUSDT is redeployed too. `DUELME_ADDRESSES` and
   `FORWARDER_ADDRESSES` are derived from that table; editing them directly does nothing,
2a. update `faucet.mock-usdt-address` in `backend/src/main/resources/application.yml`, or the
   faucet keeps handing out the previous token. That value is deliberately a bare literal with no
   environment override, and `deployedAddresses.test.ts` pins it to the broadcast artifact —
   keep the quotes, or YAML reads the address as a hex number and the backend refuses to start,
3. sync the root `README.md` contract block with `python3 ../scripts/sync_readme_contract_addresses.py` (or use the configured git hook).
4. confirm **all three** contracts came back verified — `--verify` reports per contract and a
   single failure is easy to miss in the deploy log:

   ```bash
   API=https://api.etherscan.io/v2/api
   for a in <forwarder> <usdt> <duelMe>; do
     curl -s "$API?chainid=421614&module=contract&action=getsourcecode&address=$a&apikey=$ARBISCAN_API_KEY" \
       | python3 -c "import json,sys; print(json.load(sys.stdin)['result'][0].get('ContractName') or 'NOT VERIFIED')"
   done
   ```

   Anything still unverified is fixed in place with `forge verify-contract` — see
   `script/Deploy.s.sol` for the constructor-args incantation.
