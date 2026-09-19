// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "./helpers/PlainUsdt.sol";

/// @notice The read side: batch duel reads that replaced "fetch every duel on every refresh",
///         and the player record the reputation UI is built on.
contract DuelMeViewsTest is Test {
    DuelMe public duelMe;
    PlainUsdt public usdt;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant WAGER = 10_000_000;
    uint96 public constant MIN_WAGER = 300_000;

    function setUp() public {
        usdt = new PlainUsdt();
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(new ERC2771Forwarder("DuelMe Forwarder")));

        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);
        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);
    }

    function _openDuels(uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            vm.prank(alice);
            duelMe.createDuel(WAGER + i, bytes32(0));
        }
    }

    // ── Batch reads ──────────────────────────────────────────────────────

    function testGetDuelsReturnsTheRequestedWindow() public {
        _openDuels(5);

        DuelMe.DuelView[] memory page = duelMe.getDuels(1, 3);

        assertEq(page.length, 3);
        assertEq(page[0].wagerAmount, WAGER + 1);
        assertEq(page[2].wagerAmount, WAGER + 3);
    }

    function testGetDuelsClampsToDuelCount() public {
        _openDuels(3);

        DuelMe.DuelView[] memory page = duelMe.getDuels(2, 50);

        assertEq(page.length, 1);
        assertEq(page[0].wagerAmount, WAGER + 2);
    }

    function testGetDuelsBeyondTheEndIsEmpty() public {
        _openDuels(2);

        assertEq(duelMe.getDuels(2, 10).length, 0);
        assertEq(duelMe.getDuels(0, 0).length, 0);
        assertEq(duelMe.getDuels(0, 10).length, 2);
    }

    function testGetDuelsByIdsKeepsTheRequestedOrder() public {
        _openDuels(4);

        uint256[] memory ids = new uint256[](3);
        ids[0] = 3;
        ids[1] = 0;
        ids[2] = 2;

        DuelMe.DuelView[] memory result = duelMe.getDuelsByIds(ids);

        assertEq(result.length, 3);
        assertEq(result[0].wagerAmount, WAGER + 3);
        assertEq(result[1].wagerAmount, WAGER);
        assertEq(result[2].wagerAmount, WAGER + 2);
    }

    /// @dev Read from a non-zero offset on purpose: with `offset == 0` the loop compares
    ///      `_duelView(i)` with itself and could not tell an off-by-one in `getDuels` from
    ///      agreement. The wager is `WAGER + id`, so the entry is also pinned to its own id.
    function testGetDuelsMatchesGetDuel() public {
        _openDuels(4);
        vm.prank(bob);
        duelMe.joinDuel(2, bytes32(0));

        uint256 offset = 1;
        DuelMe.DuelView[] memory page = duelMe.getDuels(offset, 3);
        assertEq(page.length, 3);

        for (uint256 i = 0; i < page.length; i++) {
            uint256 duelId = offset + i;
            assertEq(page[i].wagerAmount, WAGER + duelId, "window is offset by the wrong amount");
            assertEq(
                keccak256(abi.encode(page[i])),
                keccak256(abi.encode(duelMe.getDuel(duelId))),
                "batch and single disagree"
            );
        }
    }

    function testGetDuelsAcceptsAnUnboundedLimit() public {
        _openDuels(3);

        // "Everything from here" must be answerable, not an arithmetic panic on offset + limit.
        DuelMe.DuelView[] memory page = duelMe.getDuels(1, type(uint256).max);

        assertEq(page.length, 2);
        assertEq(page[0].wagerAmount, WAGER + 1);
        assertEq(page[1].wagerAmount, WAGER + 2);
    }

    // ── Player record ────────────────────────────────────────────────────

    function testResolutionRecordsWinsLossesAndVolume() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        vm.prank(alice);
        duelMe.claimVictory(duelId);
        vm.prank(bob);
        duelMe.confirmResult(duelId);

        DuelMe.PlayerStats memory winner = duelMe.getPlayerStats(alice);
        assertEq(winner.duelsWon, 1);
        assertEq(winner.duelsLost, 0);
        assertEq(winner.duelsHonored, 1);
        assertEq(winner.volume, WAGER, "volume counts the player's own stake");

        DuelMe.PlayerStats memory loser = duelMe.getPlayerStats(bob);
        assertEq(loser.duelsWon, 0);
        assertEq(loser.duelsLost, 1);
        assertEq(loser.duelsHonored, 1);
        assertEq(loser.volume, WAGER);
    }

    function testAdmitDefeatRecordsTheSameWayAsAConfirmedClaim() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        vm.prank(bob);
        duelMe.admitDefeat(duelId);

        assertEq(duelMe.getPlayerStats(alice).duelsWon, 1);
        assertEq(duelMe.getPlayerStats(bob).duelsLost, 1);
        assertEq(duelMe.getPlayerStats(bob).duelsHonored, 1, "admitting defeat is honouring the duel");
    }

    function testTimeoutRefundRecordsNoWinnerButCountsVolume() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        vm.prank(alice);
        duelMe.claimVictory(duelId);
        vm.warp(block.timestamp + duelMe.claimTimeout() + 1);
        duelMe.refund(duelId);

        DuelMe.PlayerStats memory claimer = duelMe.getPlayerStats(alice);
        assertEq(claimer.duelsHonored, 1);
        assertEq(claimer.duelsWon, 0, "a timeout is not a win");
        assertEq(claimer.volume, WAGER);

        DuelMe.PlayerStats memory nonResponder = duelMe.getPlayerStats(bob);
        assertEq(nonResponder.duelsAbandoned, 1);
        assertEq(nonResponder.duelsLost, 0);
        assertEq(nonResponder.volume, WAGER);
    }

    function testDisputeLeavesTheRecordUntouched() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        vm.prank(alice);
        duelMe.claimVictory(duelId);
        vm.prank(bob);
        duelMe.disputeResult(duelId);

        DuelMe.PlayerStats memory stats = duelMe.getPlayerStats(alice);
        assertEq(stats.duelsHonored, 0);
        assertEq(stats.duelsWon, 0);
        assertEq(stats.volume, 0);
    }

    // ── Derived payouts ──────────────────────────────────────────────────

    function testPayoutsAreDerivedForEveryTerminalState() public {
        // Resolved: winner takes both wagers
        vm.prank(alice);
        uint256 resolved = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(resolved, bytes32(0));
        vm.prank(alice);
        duelMe.claimVictory(resolved);
        vm.prank(bob);
        duelMe.confirmResult(resolved);
        assertEq(duelMe.getDuel(resolved).creatorPayout, WAGER * 2);
        assertEq(duelMe.getDuel(resolved).opponentPayout, 0);

        // Disputed: one wager back each
        vm.prank(alice);
        uint256 disputed = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(disputed, bytes32(0));
        vm.prank(alice);
        duelMe.claimVictory(disputed);
        vm.prank(bob);
        duelMe.disputeResult(disputed);
        assertEq(duelMe.getDuel(disputed).creatorPayout, WAGER);
        assertEq(duelMe.getDuel(disputed).opponentPayout, WAGER);

        // Mutually cancelled: one wager back each
        vm.prank(alice);
        uint256 cancelled = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(cancelled, bytes32(0));
        vm.prank(alice);
        duelMe.requestMutualCancellation(cancelled);
        vm.prank(bob);
        duelMe.acceptMutualCancellation(cancelled);
        assertEq(duelMe.getDuel(cancelled).creatorPayout, WAGER);
        assertEq(duelMe.getDuel(cancelled).opponentPayout, WAGER);

        // Never funded, cancelled by the creator: their stake only
        vm.prank(alice);
        uint256 unfunded = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(alice);
        duelMe.cancelDuel(unfunded);
        assertEq(duelMe.getDuel(unfunded).creatorPayout, WAGER);
        assertEq(duelMe.getDuel(unfunded).opponentPayout, 0);

        // Refunded after a claim timed out: one wager back each
        vm.prank(alice);
        uint256 refunded = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(refunded, bytes32(0));
        vm.prank(alice);
        duelMe.claimVictory(refunded);
        vm.warp(block.timestamp + duelMe.claimTimeout() + 1);
        duelMe.refund(refunded);
        assertEq(duelMe.getDuel(refunded).creatorPayout, WAGER);
        assertEq(duelMe.getDuel(refunded).opponentPayout, WAGER);

        // Declined before funding: the creator's stake only. The hash is read before the prank:
        // a call inside the argument list would consume it.
        bytes32 inviteHash = duelMe.hashInviteSecret(bytes32(uint256(7)));
        vm.prank(alice);
        uint256 declined = duelMe.createDuel(WAGER, inviteHash);
        vm.prank(bob);
        duelMe.declineDuel(declined, bytes32(uint256(7)));
        assertEq(duelMe.getDuel(declined).creatorPayout, WAGER);
        assertEq(duelMe.getDuel(declined).opponentPayout, 0);

        // Live duels owe nothing yet
        vm.prank(alice);
        uint256 live = duelMe.createDuel(WAGER, bytes32(0));
        assertEq(duelMe.getDuel(live).creatorPayout, 0);
        assertEq(duelMe.getDuel(live).opponentPayout, 0);
    }
}
