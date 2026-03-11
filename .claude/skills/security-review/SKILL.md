---
name: security-review
description: Security audit for DuelMe smart contracts. Use before deploying to mainnet or after significant contract changes.
allowed-tools: Bash, Read, Grep, Glob
---

Perform a security review of DuelMe smart contracts.

Arguments: $ARGUMENTS (optional: specific file path, default: all contracts in `contracts/src/`)

## Checklist

Read all Solidity files and check for:

### Critical
- [ ] Reentrancy: all external calls after state changes? `nonReentrant` on all state-mutating functions?
- [ ] Access control: `onlyOwner`/`whenNotPaused` where needed?
- [ ] Integer overflow/underflow (Solidity 0.8+ has built-in, but check unchecked blocks)
- [ ] Token handling: `SafeERC20` used for all transfers? No raw `.transfer()`?
- [ ] USDT-specific: blocklist risk? Push vs pull pattern?
- [ ] State machine: can any state transition be skipped or replayed?

### High
- [ ] Front-running: can tx ordering be exploited?
- [ ] Timestamp dependence: is `block.timestamp` used safely?
- [ ] DoS: can any function be griefed to always revert?
- [ ] Fund lock: can funds get permanently stuck?
- [ ] Emergency: can owner rescue stuck funds?

### Medium
- [ ] Event emission: all state changes emit events?
- [ ] Input validation: all require() checks present?
- [ ] Gas: unbounded loops? Storage vs memory?
- [ ] Centralization: what can owner do? Is it documented?

### Low
- [ ] Naming: consistent, no shadowing?
- [ ] Dead code: unused functions or variables?
- [ ] Compiler version: fixed, not floating?

## Output

Report findings grouped by severity (Critical / High / Medium / Low / Informational).
For each finding: title, description, location (file:line), recommendation.
End with a summary: "X critical, Y high, Z medium, W low findings."
