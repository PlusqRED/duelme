// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Asks a token, once, whether it takes a cut of a transfer.
/// @dev `DuelMe` pays out exactly twice the wager it recorded. A token that delivers less than it
///      was asked to move breaks that arithmetic silently, and the players who claim last are the
///      ones who find out. The wager token is `immutable`, so this is one question about one
///      address — asked here, at deploy, rather than on every create and join for the life of the
///      contract.
///
///      It cannot cover a fee switched on *after* deploy. Nothing on-chain can, cheaply: the
///      response to that is `pause()`, which blocks entering a duel while leaving every payout and
///      refund open.
library TokenFeeProbe {
    /// @dev Moves `probeAmount` from `holder` to itself and requires the balance to come back
    ///      whole. A percentage fee is taken on any transfer, self-transfers included — the
    ///      sender is debited the full amount and credited the amount minus the fee — so the
    ///      round trip is a real measurement and costs nothing when the answer is "no fee".
    ///      The caller must be `holder`: in a deploy script that means running inside
    ///      `vm.startBroadcast(deployerKey)`.
    function requireNoTransferFee(IERC20 token, address holder, uint256 probeAmount) internal {
        require(probeAmount > 0, "TokenFeeProbe: probe amount is zero");

        uint256 balanceBefore = token.balanceOf(holder);
        require(balanceBefore >= probeAmount, "TokenFeeProbe: holder needs a probe balance");

        SafeERC20.safeTransfer(token, holder, probeAmount);

        require(token.balanceOf(holder) == balanceBefore, "TokenFeeProbe: token takes a transfer fee");
    }
}
