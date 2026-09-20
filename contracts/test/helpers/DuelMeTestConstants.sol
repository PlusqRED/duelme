// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @notice The values every DuelMe suite starts from.
/// @dev Two test bases need them — `DuelMeFixture` for the suites that duel with plain addresses,
///      `MetaTxSigner` for the ones that need signer keys — and each used to declare its own copy
///      under its own name. `MIN_WAGER` had three homes and the one invite secret had two
///      spellings, which is the drift the fixture was extracted to stop.
library DuelMeTestConstants {
    uint256 internal constant WAGER = 10_000_000; // 10 USDT
    uint96 internal constant MIN_WAGER = 300_000; // 0.3 USDT
    uint256 internal constant STARTING_BALANCE = 1_000_000_000; // 1000 USDT
    bytes32 internal constant DEFAULT_INVITE_SECRET = bytes32(uint256(1));

    /// @dev What `DEFAULT_INVITE_HASH` holds until a `setUp` assigns it from the contract, so the
    ///      hash formula lives only in `DuelMe.hashInviteSecret`. Deliberately non-zero:
    ///      `bytes32(0)` is how the contract spells "open duel", so a suite that skipped the
    ///      assignment would silently create duels anyone can join, and every invite assertion in
    ///      it would pass for the wrong reason. This value fails as "Invalid invite" instead.
    bytes32 internal constant UNSET_INVITE_HASH = keccak256("DuelMeTestConstants: invite hash not set in setUp");
}
