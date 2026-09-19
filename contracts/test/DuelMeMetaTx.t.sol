// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./helpers/MetaTxSigner.sol";
import "../src/DuelMe.sol";
import "../src/MockUSDT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Errors.sol";

/// @dev Appends an address to the calldata exactly the way a forwarder does, without
///      being the trusted one. Proves the suffix alone cannot spoof a sender.
contract NaiveRelayer {
    function relay(address target, bytes calldata data, address spoofedSender) external {
        (bool success,) = target.call(abi.encodePacked(data, spoofedSender));
        require(success, "relay failed");
    }

    function approveMax(MockUSDT token, address spender) external {
        token.approve(spender, type(uint256).max);
    }
}

contract DuelMeMetaTxTest is MetaTxSigner {
    DuelMe public duelMe;
    MockUSDT public usdt;
    ERC2771Forwarder public forwarder;

    address public owner;
    uint256 internal ownerKey;
    address public alice;
    uint256 internal aliceKey;
    address public bob;
    uint256 internal bobKey;
    address public relayer = makeAddr("relayer");

    function setUp() public {
        (owner, ownerKey) = makeAddrAndKey("owner");
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

        usdt = new MockUSDT();
        forwarder = new ERC2771Forwarder(FORWARDER_NAME);

        vm.prank(owner);
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(forwarder));
        INVITE_HASH = duelMe.hashInviteSecret(INVITE_SECRET);

        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);

        // This suite exercises relaying, not funding — approvals are out of the way so a
        // failure can only come from sender resolution. EIP-2612 lives in DuelMePermit.t.sol.
        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);

        // Nobody in this suite can afford their own gas.
        vm.deal(alice, 0);
        vm.deal(bob, 0);
        vm.deal(owner, 0);
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    /// @dev createDuel is overloaded, so abi.encodeCall cannot resolve it — the two
    ///      signatures are spelled out here once instead of at every call site.
    function _createDuelData(uint256 amount, bytes32 inviteHash) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("createDuel(uint256,bytes32)", amount, inviteHash);
    }

    function _createDuelData(uint256 amount, bytes32 inviteHash, string memory message)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeWithSignature("createDuel(uint256,bytes32,string)", amount, inviteHash, message);
    }


    function _relayedCreateAndJoin() internal returns (uint256 duelId) {
        duelId = duelMe.duelCount();
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.joinDuel, (duelId, INVITE_SECRET)));
    }

    // =====================================================================
    // Sender resolution through the trusted forwarder
    // =====================================================================

    function testRelayedCreateDuelAttributesCreatorToSigner() public {
        uint256 aliceBalanceBefore = usdt.balanceOf(alice);

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));

        DuelMe.DuelView memory duel = duelMe.getDuel(0);
        assertEq(duel.creator, alice, "creator must be the signer");
        assertEq(usdt.balanceOf(alice), aliceBalanceBefore - WAGER);
        assertEq(usdt.balanceOf(address(forwarder)), 0, "forwarder must never hold funds");
        assertEq(alice.balance, 0, "signer paid no gas");
    }

    function testRelayedCreateDuelWithMessage() public {
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH, unicode"пора дуэли"));

        DuelMe.DuelView memory duel = duelMe.getDuel(0);
        assertEq(duel.creator, alice);
        assertEq(duel.message, unicode"пора дуэли");
    }

    function testRelayedJoinDuelAttributesOpponentToSigner() public {
        uint256 duelId = _relayedCreateAndJoin();

        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        assertEq(duel.opponent, bob, "opponent must be the signer");
        assertEq(uint8(duel.state), uint8(DuelMe.DuelState.Funded));
    }

    function testRelayedDeclineDuel() public {
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.declineDuel, (0, INVITE_SECRET)));

        DuelMe.DuelView memory duel = duelMe.getDuel(0);
        assertEq(duel.opponent, bob);
        assertEq(uint8(duel.state), uint8(DuelMe.DuelState.Declined));
    }

    function testRelayedClaimVictoryAndConfirmResult() public {
        uint256 duelId = _relayedCreateAndJoin();

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (duelId)));
        DuelMe.DuelView memory claimed = duelMe.getDuel(duelId);
        assertEq(claimed.claimedBy, alice);
        assertEq(claimed.claimedWinner, alice);

        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.confirmResult, (duelId)));
        DuelMe.DuelView memory resolved = duelMe.getDuel(duelId);
        assertEq(uint8(resolved.state), uint8(DuelMe.DuelState.Resolved));
        assertEq(resolved.creatorPayout, WAGER * 2);
    }

    function testRelayedAdmitDefeatCreditsTheOtherPlayer() public {
        uint256 duelId = _relayedCreateAndJoin();

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.admitDefeat, (duelId)));

        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        assertEq(duel.claimedBy, alice);
        assertEq(duel.claimedWinner, bob);
    }

    function testRelayedMutualCancellationRoundTrip() public {
        uint256 duelId = _relayedCreateAndJoin();

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.requestMutualCancellation, (duelId)));
        assertEq(duelMe.getDuel(duelId).cancelRequestedBy, alice);

        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.declineMutualCancellation, (duelId)));
        assertEq(uint8(duelMe.getDuel(duelId).state), uint8(DuelMe.DuelState.Funded));

        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.requestMutualCancellation, (duelId)));
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.acceptMutualCancellation, (duelId)));
        assertEq(uint8(duelMe.getDuel(duelId).state), uint8(DuelMe.DuelState.MutuallyCancelled));
    }

    function testRelayedWithdrawMutualCancellationRequest() public {
        uint256 duelId = _relayedCreateAndJoin();

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.requestMutualCancellation, (duelId)));
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.withdrawMutualCancellationRequest, (duelId)));

        assertEq(uint8(duelMe.getDuel(duelId).state), uint8(DuelMe.DuelState.Funded));
    }

    function testRelayedDisputeResult() public {
        uint256 duelId = _relayedCreateAndJoin();

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (duelId)));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.disputeResult, (duelId)));

        assertEq(uint8(duelMe.getDuel(duelId).state), uint8(DuelMe.DuelState.Disputed));
    }

    function testRelayedCancelDuelOnlyWorksForCreator() public {
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));

        ERC2771Forwarder.ForwardRequestData memory bobRequest =
            _forwardRequest(forwarder, bobKey, address(duelMe), abi.encodeCall(DuelMe.cancelDuel, (0)));
        vm.prank(relayer);
        vm.expectRevert(Errors.FailedCall.selector);
        forwarder.execute(bobRequest);

        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.cancelDuel, (0)));
        assertEq(uint8(duelMe.getDuel(0).state), uint8(DuelMe.DuelState.Cancelled));
    }

    function testRelayedClaimPayoutPaysTheSigner() public {
        uint256 duelId = _relayedCreateAndJoin();
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (duelId)));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.confirmResult, (duelId)));

        uint256 balanceBefore = usdt.balanceOf(alice);
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimPayout, (duelId)));

        assertEq(usdt.balanceOf(alice), balanceBefore + WAGER * 2);
        assertEq(usdt.balanceOf(relayer), 0, "relayer must not receive the payout");
    }

    /// @dev The forwarder appends 20 bytes to calldata. Dynamic array arguments are the
    ///      case where a decoder that trusted msg.data.length would break, so relay them.
    function testRelayedClaimPayoutsDecodesDynamicArrayCalldata() public {
        uint256 firstDuel = _relayedCreateAndJoin();
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (firstDuel)));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.confirmResult, (firstDuel)));

        uint256 secondDuel = _relayedCreateAndJoin();
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (secondDuel)));
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.confirmResult, (secondDuel)));

        uint256[] memory duelIds = new uint256[](2);
        duelIds[0] = firstDuel;
        duelIds[1] = secondDuel;

        uint256 balanceBefore = usdt.balanceOf(alice);
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimPayouts, (duelIds)));

        assertEq(usdt.balanceOf(alice), balanceBefore + WAGER * 2, "only alice's own payout");
    }

    function testRelayedRefundAndClaimPayouts() public {
        uint256 duelId = _relayedCreateAndJoin();
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (duelId)));

        vm.warp(block.timestamp + duelMe.claimTimeout());

        uint256[] memory duelIds = new uint256[](1);
        duelIds[0] = duelId;

        uint256 balanceBefore = usdt.balanceOf(alice);
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.refundAndClaimPayouts, (duelIds)));

        assertEq(usdt.balanceOf(alice), balanceBefore + WAGER);
        uint32 honored = duelMe.getPlayerStats(alice).duelsHonored;
        assertEq(honored, 1, "claimer keeps their reputation credit");
    }

    /// @dev Admin authority must not be reachable by signature. Relaying it would turn one
    ///      blind EIP-712 signature from the owner key — no gas, no transaction, `data` shown
    ///      as an opaque blob — into a permanent takeover submitted by whoever holds it.
    function testRelayedOwnerCannotPause() public {
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, ownerKey, address(duelMe), abi.encodeCall(DuelMe.pause, ()));

        vm.prank(relayer);
        vm.expectRevert(Errors.FailedCall.selector);
        forwarder.execute(request);

        assertFalse(duelMe.paused());
    }

    function testRelayedOwnerCannotTransferOwnership() public {
        ERC2771Forwarder.ForwardRequestData memory request = _forwardRequest(
            forwarder, ownerKey, address(duelMe), abi.encodeCall(Ownable.transferOwnership, (alice))
        );

        vm.prank(relayer);
        vm.expectRevert(Errors.FailedCall.selector);
        forwarder.execute(request);

        assertEq(duelMe.owner(), owner, "ownership must survive a relayed transfer");
    }

    function testRelayedOwnerCannotRenounceOwnership() public {
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, ownerKey, address(duelMe), abi.encodeCall(Ownable.renounceOwnership, ()));

        vm.prank(relayer);
        vm.expectRevert(Errors.FailedCall.selector);
        forwarder.execute(request);

        assertEq(duelMe.owner(), owner);
    }

    function testOwnerCanStillPauseDirectly() public {
        vm.prank(owner);
        duelMe.pause();
        assertTrue(duelMe.paused());

        vm.prank(owner);
        duelMe.unpause();
        assertFalse(duelMe.paused());
    }

    function testRelayedNonOwnerCannotPause() public {
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, aliceKey, address(duelMe), abi.encodeCall(DuelMe.pause, ()));

        vm.prank(relayer);
        vm.expectRevert(Errors.FailedCall.selector);
        forwarder.execute(request);

        assertFalse(duelMe.paused());
    }

    function testDirectCallStillUsesMsgSender() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, INVITE_HASH);

        assertEq(duelMe.getDuel(duelId).creator, alice);
    }

    // =====================================================================
    // Forwarder validation
    // =====================================================================

    function testReplayedRequestReverts() public {
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));

        vm.prank(relayer);
        forwarder.execute(request);

        // The nonce moved on, so the same signature now recovers against a different
        // struct hash and fails the signer check.
        assertFalse(forwarder.verify(request));
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(ERC2771Forwarder.ERC2771ForwarderInvalidSigner.selector, _recoveredSigner(request), alice)
        );
        forwarder.execute(request);

        assertEq(duelMe.duelCount(), 1);
    }

    function testExpiredRequestReverts() public {
        uint48 deadline = uint48(block.timestamp + 10 minutes);
        ERC2771Forwarder.ForwardRequestData memory request = _forwardRequest(
            forwarder,
            aliceKey,
            address(duelMe),
            _createDuelData(WAGER, INVITE_HASH),
            DEFAULT_REQUEST_GAS,
            deadline
        );

        vm.warp(uint256(deadline) + 1);

        assertFalse(forwarder.verify(request));
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(ERC2771Forwarder.ERC2771ForwarderExpiredRequest.selector, deadline));
        forwarder.execute(request);
    }

    function testTamperedCalldataReverts() public {
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));

        // Relayer tries to raise the wager after the fact.
        request.data = _createDuelData(WAGER * 10, INVITE_HASH);

        assertFalse(forwarder.verify(request));
        vm.prank(relayer);
        vm.expectRevert();
        forwarder.execute(request);
    }

    function testRequestSignedByAnotherAccountReverts() public {
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, bobKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));

        // Bob signed it; the relayer claims it came from alice.
        request.from = alice;

        assertFalse(forwarder.verify(request));
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ERC2771Forwarder.ERC2771ForwarderInvalidSigner.selector, _recoveredSigner(request), alice
            )
        );
        forwarder.execute(request);

        assertEq(duelMe.duelCount(), 0);
    }

    function testUntrustedForwarderIsRejected() public {
        ERC2771Forwarder rogue = new ERC2771Forwarder("Rogue Forwarder");
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(rogue, aliceKey, address(duelMe), _createDuelData(WAGER, INVITE_HASH));

        assertFalse(rogue.verify(request));
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(ERC2771Forwarder.ERC2771UntrustfulTarget.selector, address(duelMe), address(rogue))
        );
        rogue.execute(request);

        assertEq(duelMe.duelCount(), 0);
    }

    function testCalldataSuffixFromUntrustedCallerCannotSpoofSender() public {
        NaiveRelayer naive = new NaiveRelayer();
        usdt.mint(address(naive), WAGER);
        naive.approveMax(usdt, address(duelMe));

        naive.relay(address(duelMe), _createDuelData(WAGER, INVITE_HASH), alice);

        // The appended address is ignored: DuelMe only honours the suffix from its one
        // trusted forwarder, so the naive relayer itself is the creator.
        assertEq(duelMe.getDuel(0).creator, address(naive));
    }

    // =====================================================================
    // Gas accounting (_checkForwardedGas)
    // =====================================================================

    /// @dev The forwarder burns the whole outer budget when the relayer under-funds a
    ///      request, so the relayer must send at least request.gas * 64 / 63 plus its own
    ///      overhead. A request promising far more gas than the relayer supplies trips it.
    function testUnderFundedOuterGasReverts() public {
        ERC2771Forwarder.ForwardRequestData memory request = _forwardRequest(
            forwarder,
            aliceKey,
            address(duelMe),
            _createDuelData(WAGER, INVITE_HASH),
            30_000_000,
            uint48(block.timestamp + 1 hours)
        );

        vm.prank(relayer);
        (bool success,) =
            address(forwarder).call{gas: 600_000}(abi.encodeCall(ERC2771Forwarder.execute, (request)));

        assertFalse(success, "under-funded relay must revert");
        assertEq(duelMe.duelCount(), 0);
    }

    function testOuterGasAboveTheSixtyFourOverSixtyThreeFloorSucceeds() public {
        uint256 requestGas = 400_000;
        ERC2771Forwarder.ForwardRequestData memory request = _forwardRequest(
            forwarder,
            aliceKey,
            address(duelMe),
            _createDuelData(WAGER, INVITE_HASH),
            requestGas,
            uint48(block.timestamp + 1 hours)
        );

        vm.prank(relayer);
        (bool success,) = address(forwarder).call{gas: (requestGas * 64) / 63 + 80_000}(
            abi.encodeCall(ERC2771Forwarder.execute, (request))
        );

        assertTrue(success, "correctly funded relay must succeed");
        assertEq(duelMe.getDuel(0).creator, alice);
    }

    /// @dev Recovers whoever a mutated request now maps to. Both the forwarder nonce and
    ///      `from` feed the struct hash, so tampering with either re-points the recovery at
    ///      an unrelated address — the tests assert that address rather than hardcoding it.
    function _recoveredSigner(ERC2771Forwarder.ForwardRequestData memory request)
        internal
        view
        returns (address)
    {
        return ECDSA.recover(_forwardRequestDigest(forwarder, request), request.signature);
    }

    /// @dev The owner half of the relaying rule. Player actions are relayed on purpose; an
    ///      ownership handover is not, or a single off-chain signature from the incoming owner
    ///      would be enough for someone else to complete it at a moment of their choosing.
    function testRelayedAcceptOwnershipIsRejected() public {
        vm.prank(owner);
        duelMe.transferOwnership(alice);

        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, aliceKey, address(duelMe), abi.encodeCall(DuelMe.acceptOwnership, ()));

        vm.prank(relayer);
        vm.expectRevert();
        forwarder.execute(request);

        assertEq(duelMe.owner(), owner, "ownership must not move through the forwarder");

        // The same handover goes through as a direct transaction.
        vm.prank(alice);
        duelMe.acceptOwnership();
        assertEq(duelMe.owner(), alice);
    }

    /// @dev Creating is stopped, but a duel already on the board still plays out over the relay.
    function testRelayedActionsKeepWorkingWhileDuelCreationIsPaused() public {
        uint256 duelId = _relayedCreateAndJoin();
        vm.prank(owner);
        duelMe.setDuelCreationPaused(true);

        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.admitDefeat, (duelId)));

        assertEq(uint256(duelMe.getDuel(duelId).state), uint256(DuelMe.DuelState.Resolved));
    }
}
