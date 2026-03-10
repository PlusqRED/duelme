// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDT - Testnet USDT for DuelMe testing
/// @notice Anyone can mint tokens. DO NOT use in production.
contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address. Open for testnet use.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Convenience: mint 1000 USDT to caller
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 6);
    }
}
