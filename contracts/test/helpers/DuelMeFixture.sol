// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "../../script/ForwarderConfig.sol";
import "../../src/DuelMe.sol";
import "./PlainUsdt.sol";

/// @notice The scaffolding every DuelMe suite needs: a token, a forwarder, a contract, and two
///         funded players.
/// @dev Seven suites used to carry their own copy of this, along with their own `WAGER`,
///      `MIN_WAGER` and invite-hash constants and, in three of them, their own
///      `_createAndFundDuel`. One constructor argument changing meant seven edits, and a suite
///      that missed one compiled against a different world than its neighbours.
///
///      Suites that need a different token override `_deployToken`; suites that need more
///      players call `_fund` for each. Everything else calls `_deployFixture()` from `setUp` and
///      gets the same starting position.
abstract contract DuelMeFixture is Test {
    DuelMe public duelMe;
    PlainUsdt public usdt;
    ERC2771Forwarder public forwarder;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant WAGER = 10_000_000; // 10 USDT
    uint96 public constant MIN_WAGER = 300_000; // 0.3 USDT
    uint256 public constant STARTING_BALANCE = 1_000_000_000; // 1000 USDT

    bytes32 public constant DEFAULT_INVITE_SECRET = bytes32(uint256(1));

    /// @dev Set by `_deployFixture` from the contract itself, so the formula lives in exactly one
    ///      place. Non-zero placeholder on purpose: a suite that never deploys the fixture fails
    ///      as "Invalid invite" instead of silently creating duels anyone can join, which would
    ///      make every invite assertion in it pass for the wrong reason.
    bytes32 public DEFAULT_INVITE_HASH = keccak256("DuelMeFixture: _deployFixture() not called in setUp");

    /// @dev The wager token. Overridden by suites that need one that behaves differently —
    ///      `FeeOnTransferERC20` in `DuelMeTokenSafety` — which is why it returns the base type.
    function _deployToken() internal virtual returns (PlainUsdt) {
        return new PlainUsdt();
    }

    /// @dev Deploys the token, the forwarder and DuelMe, and funds alice and bob.
    function _deployFixture() internal {
        usdt = _deployToken();
        forwarder = new ERC2771Forwarder(ForwarderConfig.NAME);
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(forwarder));
        DEFAULT_INVITE_HASH = duelMe.hashInviteSecret(DEFAULT_INVITE_SECRET);

        _fund(alice);
        _fund(bob);
    }

    /// @dev Gives a player a starting balance and an open-ended approval.
    function _fund(address player) internal {
        usdt.mint(player, STARTING_BALANCE);
        vm.prank(player);
        usdt.approve(address(duelMe), type(uint256).max);
    }

    function _createAndFundDuel() internal returns (uint256 duelId) {
        vm.prank(alice);
        duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function _createFundAndClaim() internal returns (uint256 duelId) {
        duelId = _createAndFundDuel();
        vm.prank(alice);
        duelMe.claimVictory(duelId);
    }

    function _assertPayouts(
        uint256 duelId,
        uint256 expectedCreatorPayout,
        uint256 expectedOpponentPayout,
        bool expectedCreatorClaimed,
        bool expectedOpponentClaimed
    ) internal view {
        DuelMe.DuelView memory d = duelMe.getDuel(duelId);
        assertEq(d.creatorPayout, expectedCreatorPayout, "creator payout");
        assertEq(d.opponentPayout, expectedOpponentPayout, "opponent payout");
        assertEq(d.creatorClaimed, expectedCreatorClaimed, "creator claimed");
        assertEq(d.opponentClaimed, expectedOpponentClaimed, "opponent claimed");
    }
}
