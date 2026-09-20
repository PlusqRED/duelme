// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice The wager token as most suites need it: 6 decimals, mintable by anyone, nothing else.
/// @dev One definition rather than one per suite — how the token behaves in tests is exactly the
///      kind of thing that should not drift between files. Named to read differently from
///      `src/MockUSDT.sol`, which is the testnet deployment and deliberately carries mainnet
///      USD₮0's permit quirks: suites that exercise EIP-2612 want that one, suites that only need
///      a balance want this one, and a difference of three capital letters was not enough to tell
///      them apart at a call site.
contract PlainUsdt is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
