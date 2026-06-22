# Wallet Top-Up Simplification Plan

Date: 2026-06-11

## Goal

Make DuelMe usable without requiring players to understand that they need both USDT on Arbitrum and ETH on Arbitrum for gas.

Target end state:

- A new player can fund once and start a duel.
- The default path does not mention ETH for gas.
- Create, join, claim, refund, and cancellation flows do not fail because the user has no native ETH.
- The product can still support external wallets and existing USDT-only users.

## Current Pain

Today the user must:

1. Get USDT on Arbitrum for wager escrow.
2. Get ETH on Arbitrum for gas.
3. Understand network selection, token selection, bridges/on-ramps, and failed transaction recovery.

This is too much for a gaming wager product. The product should hide gas and make "funding for duels" feel like one action.

## Recommended Direction

Use a three-phase rollout:

1. Hide gas with paymaster / gas abstraction.
2. Add a guided top-up flow with on-ramp fallback providers.
3. Add USDC as a first-class wager token and make USDC the default for new users.

The key product decision: do not make "buy USDT plus a little ETH" the main UX. It preserves the core problem.

## Phase 1: Gasless Duel Actions

### Objective

Remove the requirement that users hold ETH on Arbitrum for normal DuelMe actions.

Users should only need the wager token balance. Gas should be sponsored by DuelMe or paid from a small amount of ERC-20 through a paymaster.

### Preferred Implementation

> **Implementation note (2026-06-23):** Phase 1 shipped with **Pimlico** (`permissionless` + EIP-7702), not Alchemy. Alchemy Gas Manager mainnet sponsorship requires card billing (Stripe), which was inaccessible from the operator's region; Pimlico supports crypto-funded balances and the same EIP-7702 flow that preserves the EOA address. The Alchemy notes below are kept for historical context. Implementation: `frontend/src/lib/sponsoredTransactions.ts` + `sponsoredTransactionConfig.ts`.

Use Alchemy Wallet APIs + Gas Manager with existing Privy embedded wallets.

Why this is the preferred path:

- The current app already uses Privy embedded wallets.
- Alchemy documents a Privy integration that keeps Privy for authentication/signing while adding smart-wallet transaction infrastructure.
- EIP-7702 keeps the same user address and assets, avoiding a visible wallet migration.
- Arbitrum One and Arbitrum Sepolia are supported for bundler, gas sponsorship, and ERC-20 gas payments.
- ERC-20 gas payments support USDT on Arbitrum.

Primary references:

- Alchemy Privy integration: https://www.alchemy.com/docs/wallets/third-party/signers/privy
- Alchemy gas sponsorship: https://www.alchemy.com/docs/wallets/transactions/sponsor-gas/overview
- Alchemy EIP-7702: https://www.alchemy.com/docs/wallets/transactions/using-eip-7702
- Alchemy supported chains: https://www.alchemy.com/docs/wallets/supported-chains
- Alchemy Gas Manager FAQ: https://www.alchemy.com/docs/wallets/reference/gas-manager-faqs

Alternative:

- Pimlico ERC-20 Paymaster.
- Useful if Alchemy integration constraints or pricing become a blocker.
- Supports USDT on Arbitrum and can inject the required ERC-20 approval into the user operation.

Pimlico references:

- ERC-20 Paymaster overview: https://docs.pimlico.io/references/paymaster/erc20-paymaster
- Supported tokens: https://docs.pimlico.io/references/paymaster/erc20-paymaster/supported-tokens
- Usage guide: https://docs.pimlico.io/guides/how-to/erc20-paymaster/how-to/use-paymaster

### Scope

Gasless support for:

- `createDuel`
- `joinDuel`
- `claimPayout`
- `claimRefund`
- `cancelDuel` / mutual cancellation actions
- Any required USDT `approve` call

### Technical Tasks

1. Create Alchemy Gas Manager policies for dev and prod.
2. Add environment variables for Alchemy Wallet API key and Gas Manager policy IDs.
3. Add a smart-wallet transaction client for Privy wallets.
4. Route supported duel write operations through the smart-wallet client.
5. Batch `approve` + duel action where possible.
6. Keep the existing wagmi direct-write path as fallback for external wallets if needed.
7. Add sponsorship rules:
   - allow only known DuelMe contract addresses;
   - allow only known USDT/USDC token addresses;
   - cap gas per user per day;
   - cap total policy spend per day;
   - block arbitrary contract calls.
8. Add observability:
   - track sponsored tx count;
   - track sponsorship cost;
   - track failed user operations;
   - track action type and chain ID.

### UX Tasks

1. Remove ETH balance as a hard requirement for normal actions.
2. Replace "you need ETH for gas" copy with "Network fees are handled by DuelMe" or "Network fees are paid from your token balance" depending on selected policy.
3. If sponsorship is temporarily unavailable, show a clear fallback:
   - "Network fee sponsorship is temporarily unavailable. You can try again or use a wallet with ETH for gas."
4. Keep transaction steps understandable:
   - "Approve wager"
   - "Lock wager"
   - avoid exposing "user operation", "paymaster", or "bundler" in product copy.

### Acceptance Criteria

- A Privy embedded-wallet user with USDT on Arbitrum and zero ETH can create a duel.
- A Privy embedded-wallet user with USDT on Arbitrum and zero ETH can join a duel.
- A user with zero ETH can claim a payout/refund.
- `approve` does not require a separate ETH-funded transaction.
- Sponsorship only works for expected DuelMe calls.
- External wallet fallback still works.
- Failures produce actionable UI errors.

### Main Risks

- Paymaster abuse if policies are too broad.
- EIP-7702/signature UX may introduce new prompts.
- Existing direct wagmi write helpers may need a parallel transaction path.
- Vendor lock-in around smart-wallet infrastructure.

### Notes

Phase 1 alone solves the biggest pain: no ETH top-up. It does not fully solve "how do I get USDT/USDC onto Arbitrum?", which is Phase 2.

## Phase 2: Guided Top-Up Flow

### Objective

Make funding feel like one product action: "Add funds for duels".

The user should not have to independently choose chain, token contract, wallet address, or bridge.

### Preferred Product Flow

Entry points:

- Header wallet balance menu.
- Create duel flow when balance is insufficient.
- Join duel flow when balance is insufficient.
- Empty wallet onboarding prompt after login.

Flow:

1. User clicks `Add funds`.
2. UI preselects the active chain: Arbitrum One in prod, Arbitrum Sepolia in dev where applicable.
3. UI recommends the default token:
   - Phase 2 before USDC contract support: USDT on Arbitrum.
   - Phase 2 after USDC support starts: USDC on Arbitrum.
4. UI computes recommended amount:
   - desired wager amount;
   - optional small buffer for future duels;
   - no ETH buffer.
5. User chooses provider if needed, or provider is auto-selected.
6. On-ramp opens hosted/embedded flow with wallet address prefilled.
7. App watches wallet balance and resumes the original create/join action after funds arrive.

### Provider Strategy

Do not rely on one provider for all users.

Recommended order:

1. Coinbase Onramp for US users and Coinbase-native coverage.
2. Ramp Network for broad card/Apple Pay/Google Pay/local payment coverage.
3. Transak as fallback, especially for USDC/ETH on Arbitrum and global coverage.

Provider references:

- Coinbase Onramp quickstart: https://docs.cdp.coinbase.com/onramp/introduction/quickstart
- Coinbase supported networks: https://docs.cdp.coinbase.com/get-started/supported-networks
- Ramp configuration: https://docs.rampnetwork.com/configuration
- Ramp buy page and payment methods: https://rampnetwork.com/buy-crypto
- Transak crypto coverage: https://transak.com/crypto-coverage
- Transak country coverage: https://transak.com/global-coverage

### Important Finding

On-ramp coverage for USDT on Arbitrum is weaker than USDC on Arbitrum.

Example:

- Transak public coverage currently shows ETH and USDC on Arbitrum.
- It does not clearly show USDT on Arbitrum.

Implication:

- If DuelMe remains USDT-only, the top-up UX may need a USDC-on-ramp followed by a sponsored USDC-to-USDT swap.
- If DuelMe supports USDC directly, the on-ramp UX becomes simpler.

### Technical Tasks

1. Add a top-up configuration module:
   - chain ID;
   - token address;
   - token symbol;
   - decimals;
   - provider availability;
   - provider URL builders.
2. Add backend endpoint if provider requires secure session token generation.
   - Coinbase requires server-side token generation.
   - Pass real client IP in production where required.
3. Add frontend top-up dialog.
4. Add balance watcher after top-up redirect/close.
5. Add "resume original action" state:
   - create duel draft;
   - join duel target;
   - desired wager amount.
6. Add analytics:
   - top-up opened;
   - provider selected;
   - provider redirect;
   - balance detected;
   - resumed transaction success/failure.
7. Add fallback manual deposit screen:
   - exact wallet address;
   - exact token;
   - exact network;
   - warning against unsupported networks.

### UX Tasks

1. Use product language:
   - "Add funds"
   - "For duels"
   - "Network fees handled"
2. Avoid user-facing crypto jargon:
   - avoid "gas", "L2", "ERC-20", "bridging" in primary copy.
3. For insufficient balance, show one primary action:
   - `Add 10 USDT`
   - or `Add 10 USDC`
4. Show status after on-ramp:
   - "Waiting for funds"
   - "Funds received"
   - "Continue duel"
5. Provide manual fallback for experienced users.

### Acceptance Criteria

- From create/join, an underfunded user can open top-up with token, chain, and address prefilled.
- After funds arrive, the app detects the new balance without a full reload.
- The original duel action can continue after funding.
- The flow never asks for ETH as a normal requirement.
- Provider failure has a fallback provider or manual deposit option.

### Main Risks

- Provider availability varies by user country, payment method, token, and compliance rules.
- On-ramp transaction completion can take minutes to days depending on payment method and KYC.
- Hosted provider UX may break continuity unless resume state is robust.
- Some providers require allowlisted domains, webhooks, signed URLs, or production approval.

## Phase 3: USDC as First-Class Wager Token

### Objective

Make USDC on Arbitrum the default funding and wager token for new users, while preserving USDT support for existing liquidity/users.

This reduces funding friction because USDC on Arbitrum has stronger on-ramp and infrastructure support than USDT on Arbitrum.

### Product Decision

Default for new users:

- USDC on Arbitrum.

Still supported:

- USDT on Arbitrum.

Product copy should say dollars or stable balance where possible, and only expose USDC/USDT choice when it matters.

### Contract Options

Option A: Deploy a new multi-token DuelMe contract.

Pros:

- Clean design.
- Can model each duel with an explicit wager token.
- Can support USDC, USDT, and future stablecoins.

Cons:

- Requires migration and frontend/backfill work.
- Existing contract state remains separate.

Option B: Deploy a second DuelMe contract for USDC.

Pros:

- Lowest smart-contract complexity.
- Existing USDT contract stays untouched.
- Clear separation of risk.

Cons:

- Duplicates indexing/read logic.
- Recent duels/profile stats need aggregate reads across contracts.
- Public duel discovery needs multi-contract support.

Recommended implementation:

- Start with Option B if speed and risk control matter most.
- Move to Option A later if multi-token support becomes a core platform feature.

### Technical Tasks

1. Decide contract approach: second USDC contract vs multi-token contract.
2. Add USDC constants for Arbitrum One and testnet.
3. Deploy USDC-compatible contract.
4. Update frontend constants and chain config.
5. Update duel creation:
   - default token = USDC;
   - advanced token selector = USDC / USDT.
6. Update join flow to read duel token and require the matching balance.
7. Update allowance checks per token.
8. Update balance display:
   - show default duel balance;
   - optionally show both USDC and USDT.
9. Update recent/public duel indexing to include token symbol/address.
10. Update backend metadata if any token fields are persisted.
11. Update tests for both token paths.

### UX Tasks

1. Make USDC the default in top-up and create-duel flows.
2. Avoid presenting token choice to new users unless needed.
3. If a user already has USDT, let them create/join USDT duels.
4. In duel cards, show token symbol beside wager amount.
5. In filters, optionally add token filter only if the number of duels justifies it.

### Acceptance Criteria

- New users can top up USDC on Arbitrum and create/join duels without ETH.
- Existing USDT duels still work.
- Duel cards, detail pages, and claim flows display the correct token.
- Allowance/balance checks use the duel's token, not a global token assumption.
- Public/recent duel feeds can handle both USDC and USDT.
- Tests cover USDC and USDT create/join/claim/refund paths.

### Main Risks

- Multi-token support can spread assumptions through frontend, backend, and contracts.
- Volume/reputation metrics need a clear denomination model.
- If USDT and USDC duels coexist, users may fragment liquidity.

### Metrics

Track before and after:

- Login to first funded duel conversion.
- Insufficient balance error rate.
- Gas-related transaction failure rate.
- Top-up started to funds received conversion.
- Create/join transaction success rate.
- Average time from top-up open to duel created/joined.
- Percentage of users needing support/manual funding instructions.

## Final Target UX

For a new user:

1. Log in with email/social.
2. Click `Create duel` or `Join`.
3. If underfunded, click `Add funds`.
4. Pay by card/Apple Pay/Google Pay/bank through an on-ramp.
5. Return to DuelMe.
6. Confirm the duel.

The user should not need to know:

- what gas is;
- why ETH is needed;
- what token contract address is;
- how to bridge to Arbitrum;
- how to manually approve a token.

## Implementation Order

1. Phase 1 first because it removes the worst failure mode immediately.
2. Phase 2 second because funding becomes coherent once ETH is no longer needed.
3. Phase 3 third because it requires contract/product changes but gives the cleanest long-term onboarding path.

## Non-Goals

- Do not build a custodial balance system for MVP.
- Do not become an on-ramp provider.
- Do not require users to buy native ETH for normal product usage.
- Do not expose paymaster/account-abstraction terminology in main UX.

