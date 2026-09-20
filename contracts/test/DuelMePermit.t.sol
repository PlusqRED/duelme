// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./helpers/MetaTxSigner.sol";
import "../src/DuelMe.sol";
import "../src/MockUSDT.sol";
import "@openzeppelin/contracts/utils/Errors.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @dev EIP-2612 funding paths. Nothing here pre-approves DuelMe: every wager has to be
///      authorised by the permit signature under test, so a broken permit cannot pass by
///      riding on an allowance set elsewhere.
contract DuelMePermitTest is MetaTxSigner {
    DuelMe public duelMe;
    MockUSDT public usdt;
    ERC2771Forwarder public forwarder;

    address public alice;
    uint256 internal aliceKey;
    address public bob;
    uint256 internal bobKey;
    address public relayer = makeAddr("relayer");
    address public attacker = makeAddr("attacker");



    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

        usdt = new MockUSDT();
        forwarder = new ERC2771Forwarder(FORWARDER_NAME);
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(forwarder));
        DEFAULT_INVITE_HASH = duelMe.hashInviteSecret(DEFAULT_INVITE_SECRET);

        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);

        vm.deal(alice, 0);
        vm.deal(bob, 0);
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    function _deadline() internal view returns (uint256) {
        return block.timestamp + 1 hours;
    }

    function _createWithPermitData(uint256 signerKey, uint256 amount, string memory message)
        internal
        view
        returns (bytes memory)
    {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), signerKey, address(duelMe), amount, deadline);
        return abi.encodeCall(DuelMe.createDuelWithPermit, (amount, DEFAULT_INVITE_HASH, message, deadline, v, r, s));
    }

    function _joinWithPermitData(uint256 signerKey, uint256 duelId, uint256 amount)
        internal
        view
        returns (bytes memory)
    {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), signerKey, address(duelMe), amount, deadline);
        return abi.encodeCall(DuelMe.joinDuelWithPermit, (duelId, DEFAULT_INVITE_SECRET, deadline, v, r, s));
    }


    // =====================================================================
    // Direct permit calls
    // =====================================================================

    /// @dev The two new entry points meet here: permit funding plus an invited opponent. A
    ///      dropped `invitedOpponent` in the hand-off to `_createDuel` would silently turn every
    ///      invited permit-duel into one anyone can take, and no other test would notice.
    function testCreateDuelForWithPermitBindsTheDuelToTheInvitee() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuelForWithPermit(WAGER, DEFAULT_INVITE_HASH, bob, "gg", deadline, v, r, s);

        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        assertEq(duel.creator, alice);
        assertEq(duel.invitedOpponent, bob, "the duel is addressed to bob");
        assertEq(duel.opponent, address(0), "nobody has joined yet");
        assertEq(duel.wagerAmount, WAGER);
        assertEq(duel.message, "gg");
        assertEq(usdt.allowance(alice, address(duelMe)), 0, "permit allowance fully consumed");
    }

    function testCreateDuelForWithPermitRefusesAnyoneButTheInvitee() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuelForWithPermit(WAGER, DEFAULT_INVITE_HASH, bob, "", deadline, v, r, s);

        vm.prank(attacker);
        usdt.approve(address(duelMe), type(uint256).max);
        usdt.mint(attacker, WAGER);

        vm.prank(attacker);
        vm.expectRevert("Not the invited opponent");
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testCreateDuelForWithPermitCannotInviteYourself() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        vm.expectRevert("Cannot invite yourself");
        duelMe.createDuelForWithPermit(WAGER, DEFAULT_INVITE_HASH, alice, "", deadline, v, r, s);
    }

    function testCreateDuelForWithPermitWhenPausedReverts() public {
        duelMe.pause();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        duelMe.createDuelForWithPermit(WAGER, DEFAULT_INVITE_HASH, bob, "", deadline, v, r, s);
    }

    function testCreateDuelWithPermitNeedsNoPriorApproval() public {
        assertEq(usdt.allowance(alice, address(duelMe)), 0, "must start with no allowance");
        uint256 balanceBefore = usdt.balanceOf(alice);

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);

        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        assertEq(duel.creator, alice);
        assertEq(duel.wagerAmount, WAGER);
        assertEq(usdt.balanceOf(alice), balanceBefore - WAGER);
        assertEq(usdt.allowance(alice, address(duelMe)), 0, "permit allowance fully consumed");
        assertEq(usdt.nonces(alice), 1, "permit nonce consumed");
    }

    function testCreateDuelWithPermitStoresMessage() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, unicode"добро пожаловать", deadline, v, r, s);

        assertEq(duelMe.getDuel(duelId).message, unicode"добро пожаловать");
    }

    function testJoinDuelWithPermitNeedsNoPriorApproval() public {
        uint256 duelId = _createDuelAsAlice();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), bobKey, address(duelMe), WAGER, deadline);

        vm.prank(bob);
        duelMe.joinDuelWithPermit(duelId, DEFAULT_INVITE_SECRET, deadline, v, r, s);

        DuelMe.DuelView memory duel = duelMe.getDuel(duelId);
        assertEq(duel.opponent, bob);
        assertEq(uint8(duel.state), uint8(DuelMe.DuelState.Funded));
        assertEq(usdt.allowance(bob, address(duelMe)), 0, "permit allowance fully consumed");
    }

    function testCreateDuelWithPermitBelowMinWagerReverts() public {
        uint256 amount = MIN_WAGER - 1;
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), amount, deadline);

        vm.prank(alice);
        vm.expectRevert("Wager below minimum");
        duelMe.createDuelWithPermit(amount, DEFAULT_INVITE_HASH, "", deadline, v, r, s);

        assertEq(usdt.allowance(alice, address(duelMe)), 0, "reverted permit leaves no allowance");
    }

    function testCreateDuelWithPermitWhenPausedReverts() public {
        duelMe.pause();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);
    }

    function testJoinDuelWithPermitWhenPausedReverts() public {
        uint256 duelId = _createDuelAsAlice();
        duelMe.pause();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), bobKey, address(duelMe), WAGER, deadline);

        vm.prank(bob);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        duelMe.joinDuelWithPermit(duelId, DEFAULT_INVITE_SECRET, deadline, v, r, s);
    }

    function testJoinDuelWithPermitWrongInviteRevertsAndLeavesNoAllowance() public {
        uint256 duelId = _createDuelAsAlice();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), bobKey, address(duelMe), WAGER, deadline);

        vm.prank(bob);
        vm.expectRevert("Invalid invite");
        duelMe.joinDuelWithPermit(duelId, bytes32(uint256(99)), deadline, v, r, s);

        assertEq(usdt.allowance(bob, address(duelMe)), 0, "failed join rolls the permit back");
        assertEq(usdt.nonces(bob), 0, "failed join rolls the permit nonce back");
    }

    function testJoinDuelWithPermitOnOwnDuelReverts() public {
        uint256 duelId = _createDuelAsAlice();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        vm.expectRevert("Cannot join own duel");
        duelMe.joinDuelWithPermit(duelId, DEFAULT_INVITE_SECRET, deadline, v, r, s);
    }

    // =====================================================================
    // Bad permit signatures
    // =====================================================================

    function testExpiredPermitReverts() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.warp(deadline + 1);

        vm.prank(alice);
        vm.expectRevert("Permit failed");
        duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);
    }

    function testPermitSignedByAnotherAccountReverts() public {
        uint256 deadline = _deadline();
        // Bob signs a permit on his own balance; alice tries to fund her duel with it.
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), bobKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        vm.expectRevert("Permit failed");
        duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);
    }

    function testPermitForSmallerAmountThanWagerReverts() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER - 1, deadline);

        // The signature covers WAGER - 1 but the call asks the token for WAGER, so the
        // digest does not match and no allowance is granted.
        vm.prank(alice);
        vm.expectRevert("Permit failed");
        duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);
    }

    function testGarbagePermitSignatureReverts() public {
        vm.prank(alice);
        vm.expectRevert("Permit failed");
        duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", _deadline(), 27, bytes32(uint256(1)), bytes32(uint256(2)));
    }

    /// @dev A permit signature is public the moment the relayer's transaction is in the
    ///      mempool. Anyone can replay it straight onto the token, burning the nonce so our
    ///      own permit reverts — while leaving exactly the allowance we needed. The duel
    ///      must still go through instead of griefing the player into a failed action.
    function testFrontRunPermitStillCreatesTheDuel() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(attacker);
        usdt.permit(alice, address(duelMe), WAGER, deadline, v, r, s);
        assertEq(usdt.allowance(alice, address(duelMe)), WAGER, "front-run already granted the allowance");

        vm.prank(alice);
        uint256 duelId = duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);

        assertEq(duelMe.getDuel(duelId).creator, alice);
        assertEq(usdt.allowance(alice, address(duelMe)), 0);
    }

    function testFrontRunPermitStillJoinsTheDuel() public {
        uint256 duelId = _createDuelAsAlice();

        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), bobKey, address(duelMe), WAGER, deadline);

        vm.prank(attacker);
        usdt.permit(bob, address(duelMe), WAGER, deadline, v, r, s);

        vm.prank(bob);
        duelMe.joinDuelWithPermit(duelId, DEFAULT_INVITE_SECRET, deadline, v, r, s);

        assertEq(duelMe.getDuel(duelId).opponent, bob);
    }

    /// @dev The catch branch accepts a pre-existing allowance, so a plain approve followed
    ///      by a dead signature still funds the duel rather than reverting.
    function testStandingAllowanceCoversAFailedPermit() public {
        vm.prank(alice);
        usdt.approve(address(duelMe), WAGER);

        vm.prank(alice);
        uint256 duelId =
            duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", _deadline(), 27, bytes32(uint256(1)), bytes32(uint256(2)));

        assertEq(duelMe.getDuel(duelId).creator, alice);
        assertEq(usdt.nonces(alice), 0, "no permit nonce was consumed");
    }

    // =====================================================================
    // Relayed permit: the full gasless path
    // =====================================================================

    function testRelayedCreateAndJoinWithPermitCostsThePlayersNoEth() public {
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createWithPermitData(aliceKey, WAGER, ""));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), _joinWithPermitData(bobKey, 0, WAGER));

        DuelMe.DuelView memory duel = duelMe.getDuel(0);
        assertEq(duel.creator, alice, "creator resolved through the forwarder");
        assertEq(duel.opponent, bob, "opponent resolved through the forwarder");
        assertEq(uint8(duel.state), uint8(DuelMe.DuelState.Funded));
        assertEq(alice.balance, 0);
        assertEq(bob.balance, 0);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
    }

    /// @dev The permit is signed for the DuelMe contract, and the forward request for the
    ///      forwarder. Neither signature authorises the relayer to touch anything else.
    function testRelayerCannotRedirectThePermitToItself() public {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(relayer);
        vm.expectRevert();
        usdt.permit(alice, relayer, WAGER, deadline, v, r, s);

        assertEq(usdt.allowance(alice, relayer), 0);
    }

    function testRelayedPermitCreateIsNotReplayable() public {
        bytes memory data = _createWithPermitData(aliceKey, WAGER, "");
        ERC2771Forwarder.ForwardRequestData memory request =
            _forwardRequest(forwarder, aliceKey, address(duelMe), data);

        vm.prank(relayer);
        forwarder.execute(request);

        // Forwarder nonce moved on, so the request no longer recovers to alice, and the
        // token nonce moved on too, so even a direct replay could not re-permit.
        assertFalse(forwarder.verify(request));
        vm.prank(relayer);
        vm.expectRevert();
        forwarder.execute(request);

        assertEq(duelMe.duelCount(), 1);
    }

    function _createDuelAsAlice() internal returns (uint256 duelId) {
        uint256 deadline = _deadline();
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(address(usdt), aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        duelId = duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);
    }
}
