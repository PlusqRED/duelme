// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "../../script/ForwarderConfig.sol";
import "../../src/DuelMe.sol";
import "./DuelMeTestConstants.sol";
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

    uint256 public constant WAGER = DuelMeTestConstants.WAGER;
    uint96 public constant MIN_WAGER = DuelMeTestConstants.MIN_WAGER;
    uint256 public constant STARTING_BALANCE = DuelMeTestConstants.STARTING_BALANCE;

    bytes32 public constant DEFAULT_INVITE_SECRET = DuelMeTestConstants.DEFAULT_INVITE_SECRET;

    /// @dev Assigned by `_deployFixture` from the contract itself; see `UNSET_INVITE_HASH` for why
    ///      the placeholder is what it is.
    bytes32 public DEFAULT_INVITE_HASH = DuelMeTestConstants.UNSET_INVITE_HASH;

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

    /// @dev Gives a player the default starting balance and an open-ended approval.
    function _fund(address player) internal {
        _fund(player, STARTING_BALANCE);
    }

    /// @dev For suites that need a different balance — the invariant run wants enough to keep
    ///      fuzzing past the point the default would run out.
    function _fund(address player, uint256 balance) internal {
        usdt.mint(player, balance);
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
