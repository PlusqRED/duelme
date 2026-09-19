// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "./helpers/PlainUsdt.sol";

/// @notice Drives DuelMe through random but legal-looking sequences. Every action is wrapped in
///         try/catch on purpose: the fuzzer is meant to explore orderings, and a call that the
///         state machine refuses is a normal outcome, not a finding.
contract DuelMeHandler is Test {
    DuelMe public duelMe;
    address[] public actors;

    // Ghost counters. Every action below swallows its own revert, so without these a run in
    // which nothing ever succeeded — a contract where no duel can be created at all — would
    // satisfy both invariants. `afterInvariant` turns that into a failure.
    /// @dev How far past `duelCount` the handler and `invariant_nothingExistsPastDuelCount`
    ///      both look.
    uint256 public constant OVERSHOOT = 4;

    uint256 public duelsCreated;
    uint256 public duelsJoined;
    uint256 public resultsDeclared;
    uint256 public resultsConfirmed;
    uint256 public duelsRefunded;
    uint256 public payoutsClaimed;

    constructor(DuelMe _duelMe, address[] memory _actors) {
        duelMe = _duelMe;
        actors = _actors;
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    /// @dev Reaches deliberately past `duelCount`. While `Created` held the zero value of
    ///      `DuelState`, an id no `createDuel` had issued yet read back as a real, fully open
    ///      duel — which is exactly how `joinDuel` on an uncreated id went unnoticed while the
    ///      fuzzer was confined to `seed % duelCount`. `Nonexistent` holds zero now, and reaching
    ///      past the count is what keeps that true. Every action swallows its own revert, so the
    ///      ids the contract refuses are a normal outcome here.
    function _duelId(uint256 seed) internal view returns (uint256) {
        return seed % (duelMe.duelCount() + OVERSHOOT);
    }

    /// @dev Actions on an existing duel draw their caller from that duel's own players, with one
    ///      call in four left to a uniformly random actor so the authorisation guards still get
    ///      exercised. Drawing uniformly for every call made a full lifecycle vanishingly
    ///      unlikely — runs spent their depth reverting, and the solvency invariants only ever
    ///      saw duels that never reached a result. The ghost counters are what caught that.
    function _player(uint256 duelId, uint256 seed) internal view returns (address) {
        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        if (seed % 4 == 0) {
            return _actor(seed);
        }
        if (duel.opponent == address(0)) {
            return duel.creator;
        }
        return seed % 2 == 0 ? duel.creator : duel.opponent;
    }

    /// @dev The player who did NOT declare the result — the only one `confirmResult` /
    ///      `disputeResult` accept.
    function _counterparty(uint256 duelId, uint256 seed) internal view returns (address) {
        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        if (seed % 4 == 0) {
            return _actor(seed);
        }
        return duel.claimedBy == duel.creator ? duel.opponent : duel.creator;
    }

    function createDuel(uint256 actorSeed, uint256 amountSeed, bool open) external {
        uint256 amount = bound(amountSeed, duelMe.minWager(), 50_000_000);
        bytes32 inviteHash = open ? bytes32(0) : duelMe.hashInviteSecret(bytes32(uint256(1)));
        vm.prank(_actor(actorSeed));
        try duelMe.createDuel(amount, inviteHash) { duelsCreated++; } catch {}
    }

    /// @dev The other creation shape: a duel addressed to one player. `invitedOpponent` can land
    ///      on the creator, which the contract refuses — that is one of the orderings worth taking.
    function createInvitedDuel(uint256 actorSeed, uint256 inviteeSeed, uint256 amountSeed, bool open) external {
        uint256 amount = bound(amountSeed, duelMe.minWager(), 50_000_000);
        bytes32 inviteHash = open ? bytes32(0) : duelMe.hashInviteSecret(bytes32(uint256(1)));
        vm.prank(_actor(actorSeed));
        try duelMe.createDuelFor(amount, inviteHash, _actor(inviteeSeed), "") { duelsCreated++; } catch {}
    }

    function joinDuel(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);

        address joiner = _actor(actorSeed);
        if (joiner == duelMe.getDuel(id).creator) {
            joiner = actors[(actorSeed % actors.length + 1) % actors.length];
        }

        vm.prank(joiner);
        try duelMe.joinDuel(id, bytes32(uint256(1))) { duelsJoined++; } catch {}
    }

    function claimVictory(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_player(id, actorSeed));
        try duelMe.claimVictory(id) { resultsDeclared++; } catch {}
    }

    function admitDefeat(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_player(id, actorSeed));
        try duelMe.admitDefeat(id) { resultsDeclared++; } catch {}
    }

    function confirmResult(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_counterparty(id, actorSeed));
        try duelMe.confirmResult(id) { resultsConfirmed++; } catch {}
    }

    function disputeResult(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_counterparty(id, actorSeed));
        try duelMe.disputeResult(id) {} catch {}
    }

    function declineDuel(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_actor(actorSeed));
        try duelMe.declineDuel(id, bytes32(uint256(1))) {} catch {}
    }

    function cancelDuel(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_player(id, actorSeed));
        try duelMe.cancelDuel(id) {} catch {}
    }

    function requestMutualCancellation(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_player(id, actorSeed));
        try duelMe.requestMutualCancellation(id) {} catch {}
    }

    function acceptMutualCancellation(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);

        DuelMe.DuelView memory duel = duelMe.getDuel(id);
        address accepter = actorSeed % 4 == 0
            ? _actor(actorSeed)
            : (duel.cancelRequestedBy == duel.creator ? duel.opponent : duel.creator);

        vm.prank(accepter);
        try duelMe.acceptMutualCancellation(id) {} catch {}
    }

    /// @dev The two ways a duel comes back out of MutualCancelRequested. Without them the fuzzer
    ///      never re-enters Funded from a pending cancellation, which is exactly where a derived
    ///      payout could start disagreeing with the state.
    function declineMutualCancellation(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_player(id, actorSeed));
        try duelMe.declineMutualCancellation(id) {} catch {}
    }

    function withdrawMutualCancellationRequest(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        vm.prank(_player(id, actorSeed));
        try duelMe.withdrawMutualCancellationRequest(id) {} catch {}
    }

    function refund(uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);
        try duelMe.refund(id) { duelsRefunded++; } catch {}
    }

    function claimPayout(uint256 actorSeed, uint256 duelSeed, bool toSelf) external {
        uint256 id = _duelId(duelSeed);

        vm.startPrank(_player(id, actorSeed));
        if (toSelf) {
            try duelMe.claimPayout(id) { payoutsClaimed++; } catch {}
        } else {
            try duelMe.claimPayoutTo(id, address(0xC01D)) { payoutsClaimed++; } catch {}
        }
        vm.stopPrank();
    }

    function claimPayouts(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);

        uint256[] memory ids = new uint256[](2);
        ids[0] = id;
        ids[1] = duelMe.duelCount() > 1 ? (id + 1) % duelMe.duelCount() : id;

        vm.prank(_player(id, actorSeed));
        try duelMe.claimPayouts(ids) { payoutsClaimed++; } catch {}
    }

    /// @dev Refund and withdraw in one call — the path where a timed-out duel is settled and
    ///      claimed inside the same loop iteration.
    function refundAndClaimPayouts(uint256 actorSeed, uint256 duelSeed) external {
        uint256 id = _duelId(duelSeed);

        uint256[] memory ids = new uint256[](1);
        ids[0] = id;

        vm.prank(_player(id, actorSeed));
        try duelMe.refundAndClaimPayouts(ids) { payoutsClaimed++; } catch {}
    }

    function skipAhead(uint256 secondsSeed) external {
        vm.warp(block.timestamp + bound(secondsSeed, 1, 3 days));
    }
}

/// @notice The property that matters when the contract holds other people's money: whatever the
///         sequence of duels, DuelMe never owes more USDT than it is holding.
contract DuelMeInvariantTest is Test {
    DuelMe public duelMe;
    PlainUsdt public usdt;
    DuelMeHandler public handler;

    uint96 public constant MIN_WAGER = 300_000;

    function setUp() public {
        usdt = new PlainUsdt();
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(new ERC2771Forwarder("DuelMe Forwarder")));

        address[] memory actors = new address[](4);
        actors[0] = makeAddr("alice");
        actors[1] = makeAddr("bob");
        actors[2] = makeAddr("charlie");
        actors[3] = makeAddr("dave");

        for (uint256 i = 0; i < actors.length; i++) {
            usdt.mint(actors[i], 10_000_000_000);
            vm.prank(actors[i]);
            usdt.approve(address(duelMe), type(uint256).max);
        }

        handler = new DuelMeHandler(duelMe, actors);
        targetContract(address(handler));
    }

    /// @dev Everything the contract still owes: unclaimed payouts on finished duels, plus the
    ///      stakes locked inside duels that have not finished.
    function _obligations() internal view returns (uint256 total) {
        uint256 count = duelMe.duelCount();
        for (uint256 i = 0; i < count; i++) {
            DuelMe.DuelView memory d = duelMe.getDuel(i);

            if (!d.creatorClaimed) {
                total += d.creatorPayout;
            }
            if (!d.opponentClaimed) {
                total += d.opponentPayout;
            }

            if (d.state == DuelMe.DuelState.Created) {
                total += d.wagerAmount;
            } else if (
                d.state == DuelMe.DuelState.Funded || d.state == DuelMe.DuelState.WinnerClaimed
                    || d.state == DuelMe.DuelState.MutualCancelRequested
            ) {
                total += d.wagerAmount * 2;
            }
        }
    }

    function invariant_contractCoversEveryObligation() public view {
        assertGe(usdt.balanceOf(address(duelMe)), _obligations(), "contract owes more than it holds");
    }

    /// @dev A finished duel never releases more than the two wagers that funded it.
    function invariant_noDuelPaysMoreThanItHolds() public view {
        uint256 count = duelMe.duelCount();
        for (uint256 i = 0; i < count; i++) {
            DuelMe.DuelView memory d = duelMe.getDuel(i);
            assertLe(d.creatorPayout + d.opponentPayout, d.wagerAmount * 2, "duel pays out more than it took in");
        }
    }

    /// @dev Nothing exists past the created range. `_createDuel` writes a new duel assuming a
    ///      virgin slot — it never resets `state` — so any entry point that manages to write to
    ///      an id before `createDuel` issues it hands that write to the duel which later takes
    ///      the id: born funded, or resolved, with one wager backing a two-wager payout.
    function invariant_nothingExistsPastDuelCount() public view {
        uint256 count = duelMe.duelCount();
        for (uint256 i = count; i < count + handler.OVERSHOOT(); i++) {
            DuelMe.DuelView memory d = duelMe.getDuel(i);
            assertEq(uint256(d.state), uint256(DuelMe.DuelState.Nonexistent), "state written past duelCount");
            assertEq(d.creator, address(0), "creator written past duelCount");
            assertEq(d.opponent, address(0), "opponent written past duelCount");
            assertEq(d.invitedOpponent, address(0), "invitee written past duelCount");
            assertEq(d.wagerAmount, 0, "wager written past duelCount");
            assertEq(d.createdAt, 0, "createdAt written past duelCount");
            assertEq(d.fundedAt, 0, "fundedAt written past duelCount");
        }
    }

    /// @dev The handler's own smoke test, and the reason the invariants above mean anything.
    ///      Every handler action swallows its own revert, so both invariants are satisfied by a
    ///      contract in which nothing ever happens: a wrong invite secret, or a caller the
    ///      contract refuses, would leave them green over duels that never got past `Created`.
    ///      This drives the same handler through a whole lifecycle and fails loudly instead.
    ///
    ///      Deliberately a plain test rather than `afterInvariant`: a single 128-call run is not
    ///      guaranteed to reach any particular state, so asserting per run would fail on an
    ///      unlucky sequence rather than on a real regression.
    function testHandlerDrivesAFullLifecycle() public {
        handler.createDuel(0, 0, true);
        handler.joinDuel(1, 0);
        handler.claimVictory(0, 0);
        handler.confirmResult(1, 0);
        handler.claimPayout(0, 0, true);

        // A second duel, left to time out: the refund path has its own counter, and a counter
        // nothing asserts is a counter that can quietly stop counting.
        handler.createDuel(0, 0, true);
        handler.joinDuel(1, 1);
        handler.claimVictory(0, 1);
        handler.skipAhead(type(uint256).max);
        handler.refund(1);

        // An invited duel, declined by the one address it names.
        handler.createInvitedDuel(0, 1, 0, true);
        assertEq(duelMe.getDuel(2).invitedOpponent, handler.actors(1), "duel 2 is addressed to bob");
        handler.declineDuel(1, 2);

        // Created and taken back before anyone joined.
        handler.createDuel(0, 0, true);
        handler.cancelDuel(0, 3);

        // Conceded outright, then withdrawn through the batch claim.
        handler.createDuel(0, 0, true);
        handler.joinDuel(1, 4);
        handler.admitDefeat(0, 4);
        handler.claimPayouts(1, 4);

        // Out of MutualCancelRequested by each of the three exits, ending in the terminal one.
        handler.createDuel(0, 0, true);
        handler.joinDuel(1, 5);
        handler.requestMutualCancellation(0, 5);
        handler.declineMutualCancellation(1, 5);
        handler.requestMutualCancellation(0, 5);
        handler.withdrawMutualCancellationRequest(0, 5);
        handler.requestMutualCancellation(0, 5);
        handler.acceptMutualCancellation(1, 5);

        // A claim the other player refuses.
        handler.createDuel(0, 0, true);
        handler.joinDuel(1, 6);
        handler.claimVictory(0, 6);
        handler.disputeResult(1, 6);

        // Refund and withdraw in the same call.
        handler.createDuel(0, 0, true);
        handler.joinDuel(1, 7);
        handler.claimVictory(0, 7);
        handler.skipAhead(type(uint256).max);
        handler.refundAndClaimPayouts(0, 7);

        assertEq(handler.duelsCreated(), 8, "created");
        assertEq(handler.duelsJoined(), 6, "funded");
        assertEq(handler.resultsDeclared(), 5, "result declared");
        assertEq(handler.resultsConfirmed(), 1, "result confirmed");
        assertEq(handler.payoutsClaimed(), 3, "payout withdrawn");
        assertEq(handler.duelsRefunded(), 1, "timed-out duel refunded");

        // One assertion per terminal state the handler can reach: a seed that stopped selecting
        // the caller the contract accepts would leave the action a silent no-op otherwise.
        assertEq(uint256(duelMe.getDuel(0).state), uint256(DuelMe.DuelState.Resolved), "0 resolved");
        assertEq(uint256(duelMe.getDuel(1).state), uint256(DuelMe.DuelState.Refunded), "1 refunded");
        assertEq(uint256(duelMe.getDuel(2).state), uint256(DuelMe.DuelState.Declined), "2 declined");
        assertEq(uint256(duelMe.getDuel(3).state), uint256(DuelMe.DuelState.Cancelled), "3 cancelled");
        assertEq(uint256(duelMe.getDuel(4).state), uint256(DuelMe.DuelState.Resolved), "4 conceded");
        assertEq(uint256(duelMe.getDuel(5).state), uint256(DuelMe.DuelState.MutuallyCancelled), "5 cancelled");
        assertEq(uint256(duelMe.getDuel(6).state), uint256(DuelMe.DuelState.Disputed), "6 disputed");
        assertEq(uint256(duelMe.getDuel(7).state), uint256(DuelMe.DuelState.Refunded), "7 refunded");

        assertGe(usdt.balanceOf(address(duelMe)), _obligations(), "contract owes more than it holds");
    }
}
