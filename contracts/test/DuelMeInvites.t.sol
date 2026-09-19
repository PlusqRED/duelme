// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "./helpers/PlainUsdt.sol";

/// @notice How a duel decides who is allowed to take it: an open lobby, a secret link, or one
///         named address. Covers the rules that keep an open duel from being griefed and a
///         private invite from being replayed somewhere else.
contract DuelMeInvitesTest is Test {
    DuelMe public duelMe;
    PlainUsdt public usdt;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public mallory = makeAddr("mallory");

    uint256 public constant WAGER = 10_000_000;
    uint96 public constant MIN_WAGER = 300_000;
    bytes32 public constant SECRET = bytes32(uint256(1));
    /// @dev Set in setUp from the contract itself, so the formula lives in exactly one place.
    ///      Non-zero placeholder on purpose: a suite that forgets the assignment fails as
    ///      "Invalid invite" instead of silently creating open duels.
    bytes32 public INVITE_HASH = keccak256("test/DuelMeInvites.t.sol: INVITE_HASH not set in setUp");


    function setUp() public {
        usdt = new PlainUsdt();
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(new ERC2771Forwarder("DuelMe Forwarder")));
        INVITE_HASH = duelMe.hashInviteSecret(SECRET);

        address[3] memory funded = [alice, bob, mallory];
        for (uint256 i = 0; i < funded.length; i++) {
            usdt.mint(funded[i], 1_000_000_000);
            vm.prank(funded[i]);
            usdt.approve(address(duelMe), type(uint256).max);
        }
    }

    // ── Open duels ───────────────────────────────────────────────────────

    function testOpenDuelIgnoresWhateverSecretIsPresented() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));

        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(uint256(999)));

        assertEq(duelMe.getDuel(duelId).opponent, bob);
    }

    /// @dev The griefing fix. An open duel's invite is public by construction, so if declining
    ///      only took the secret, any passer-by could end any duel in the lobby for free.
    function testOpenDuelCannotBeDeclined() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));

        vm.prank(mallory);
        vm.expectRevert("Open duel cannot be declined");
        duelMe.declineDuel(duelId, bytes32(0));

        assertEq(uint256(duelMe.getDuel(duelId).state), uint256(DuelMe.DuelState.Created));
    }

    function testSecretDuelCanStillBeDeclined() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, INVITE_HASH);

        vm.prank(bob);
        duelMe.declineDuel(duelId, SECRET);

        DuelMe.DuelView memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Declined));
        assertEq(d.creatorPayout, WAGER);
    }

    // ── Invites bound to this contract ───────────────────────────────────

    function testInviteFromAnotherDeploymentDoesNotOpenThisDuel() public {
        DuelMe other = new DuelMe(address(usdt), MIN_WAGER, address(new ERC2771Forwarder("DuelMe Forwarder")));
        bytes32 foreignHash = other.hashInviteSecret(SECRET);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, foreignHash);

        vm.prank(bob);
        vm.expectRevert("Invalid invite");
        duelMe.joinDuel(duelId, SECRET);
    }

    function testInviteFromAnotherChainDoesNotOpenThisDuel() public {
        bytes32 foreignHash = keccak256(abi.encode(address(duelMe), block.chainid + 1, SECRET));

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, foreignHash);

        vm.prank(bob);
        vm.expectRevert("Invalid invite");
        duelMe.joinDuel(duelId, SECRET);
    }

    // ── Duels addressed to one player ────────────────────────────────────

    function testInvitedOpponentIsTheOnlyOneWhoCanJoin() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, INVITE_HASH, bob, "");

        vm.prank(mallory);
        vm.expectRevert("Not the invited opponent");
        duelMe.joinDuel(duelId, SECRET);

        vm.prank(bob);
        duelMe.joinDuel(duelId, SECRET);
        assertEq(duelMe.getDuel(duelId).opponent, bob);
    }

    function testInvitedOpponentIsTheOnlyOneWhoCanDecline() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, INVITE_HASH, bob, "");

        vm.prank(mallory);
        vm.expectRevert("Not the invited opponent");
        duelMe.declineDuel(duelId, SECRET);

        vm.prank(bob);
        duelMe.declineDuel(duelId, SECRET);
        assertEq(uint256(duelMe.getDuel(duelId).state), uint256(DuelMe.DuelState.Declined));
    }

    /// @dev An address-bound duel needs no secret at all: the address is the invite.
    function testAddressBoundDuelWithoutSecret() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, bytes32(0), bob, "");

        vm.prank(mallory);
        vm.expectRevert("Not the invited opponent");
        duelMe.joinDuel(duelId, bytes32(0));

        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));
        assertEq(uint256(duelMe.getDuel(duelId).state), uint256(DuelMe.DuelState.Funded));
    }

    /// @dev The address is the invite, so the invitee can refuse it. Only a duel nobody is named
    ///      on is the one the griefing rule protects.
    function testAddressBoundDuelWithoutSecretCanBeDeclined() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, bytes32(0), bob, "");

        vm.prank(mallory);
        vm.expectRevert("Not the invited opponent");
        duelMe.declineDuel(duelId, bytes32(0));

        vm.prank(bob);
        duelMe.declineDuel(duelId, bytes32(0));

        DuelMe.DuelView memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Declined));
        assertEq(d.creatorPayout, WAGER, "the creator gets their stake back");
    }

    function testCannotInviteYourself() public {
        vm.prank(alice);
        vm.expectRevert("Cannot invite yourself");
        duelMe.createDuelFor(WAGER, INVITE_HASH, alice, "");
    }

    /// @dev While a duel is open the invitee lives in the view's own field: `opponent` stays
    ///      zero so existing readers keep reading it as "nobody has joined yet".
    function testViewSeparatesInviteeFromJoinedOpponent() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, INVITE_HASH, bob, "");

        DuelMe.DuelView memory open = duelMe.getDuel(duelId);
        assertEq(open.opponent, address(0), "nobody has joined yet");
        assertEq(open.invitedOpponent, bob);

        vm.prank(bob);
        duelMe.joinDuel(duelId, SECRET);

        DuelMe.DuelView memory funded = duelMe.getDuel(duelId);
        assertEq(funded.opponent, bob);
        assertEq(funded.invitedOpponent, address(0), "the duel is no longer waiting for anyone");
    }

    function testOpenDuelReportsNoInvitee() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));

        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        assertEq(duelMe.getDuel(duelId).invitedOpponent, address(0));
    }

    /// @dev A duel the creator cancelled while it was still waiting never had a second player,
    ///      even though the invitee's address is what the opponent slot was holding.
    function testCancelledInviteDuelReportsNoOpponent() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, INVITE_HASH, bob, "");

        vm.prank(alice);
        duelMe.cancelDuel(duelId);

        DuelMe.DuelView memory d = duelMe.getDuel(duelId);
        assertEq(d.opponent, address(0), "nobody ever joined");
        assertEq(d.invitedOpponent, bob);
        assertEq(d.creatorPayout, WAGER);
    }

    function testDeclinedInviteDuelRecordsTheDecliner() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuelFor(WAGER, INVITE_HASH, bob, "");

        vm.prank(bob);
        duelMe.declineDuel(duelId, SECRET);

        DuelMe.DuelView memory d = duelMe.getDuel(duelId);
        assertEq(d.opponent, bob, "the decliner is recorded");
        assertEq(d.invitedOpponent, address(0), "the duel is no longer waiting for anyone");
    }

    // ── Ids that name no duel ────────────────────────────────────────────
    //
    // `Created` is the zero value of `DuelState`, so `duels[id]` for an id no `createDuel` has
    // reached yet reads back as a legitimate, fully open duel: no invite hash, no invited
    // opponent, zero wager. Before `_requireWaitingDuel`, `joinDuel` accepted exactly that.

    function testCannotJoinADuelThatDoesNotExistYet() public {
        vm.prank(alice);
        duelMe.createDuel(WAGER, bytes32(0));

        // Read the id before arming the cheatcode — expectRevert applies to the next call made,
        // and a `duelCount()` inside the argument list would be that call.
        uint256 nextId = duelMe.duelCount();

        vm.prank(mallory);
        vm.expectRevert("Duel not in Created state");
        duelMe.joinDuel(nextId, bytes32(0));
    }

    function testCannotDeclineOrCancelADuelThatDoesNotExistYet() public {
        uint256 futureId = duelMe.duelCount() + 7;

        vm.prank(mallory);
        vm.expectRevert("Duel not in Created state");
        duelMe.declineDuel(futureId, bytes32(0));

        vm.prank(mallory);
        vm.expectRevert("Duel not in Created state");
        duelMe.cancelDuel(futureId);
    }

    /// @dev The reason `Nonexistent` holds the enum's zero value. Joining an uncreated id used to
    ///      pull a zero wager and leave `state == Funded` in the slot. `_createDuel` writes a real duel into that slot
    ///      later without resetting `state` — it is written assuming a virgin entry — so the next
    ///      duel to take that id would be born already funded, with one wager in the contract
    ///      backing a two-wager payout. The difference came out of other duels' escrow.
    function testPollutingAFutureDuelSlotCannotUnderfundTheDuelThatTakesIt() public {
        // An honest duel, fully funded, sitting in the contract.
        vm.prank(alice);
        uint256 honest = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(honest, bytes32(0));
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2, "escrow for the honest duel");

        uint256 nextId = duelMe.duelCount();

        vm.prank(mallory);
        vm.expectRevert("Duel not in Created state");
        duelMe.joinDuel(nextId, bytes32(0));

        // The slot is untouched, so the next duel starts where it should.
        vm.prank(mallory);
        assertEq(duelMe.createDuelFor(WAGER, bytes32(0), alice, ""), nextId);
        assertEq(uint256(duelMe.getDuel(nextId).state), uint256(DuelMe.DuelState.Created));
        assertEq(duelMe.getDuel(nextId).creatorPayout, 0, "nothing is owed on a duel nobody joined");
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 3, "exactly the three wagers taken in");
    }

    /// @dev The same hole, spent on reputation rather than money: a free `Funded` duel could be
    ///      conceded on the spot, and `admitDefeat` credits both sides. `duelsHonored` is what
    ///      the UI's reputation badge is computed from.
    function testReputationCannotBeFarmedFromUncreatedDuels() public {
        uint256 spentBefore = usdt.balanceOf(mallory);

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(mallory);
            vm.expectRevert("Duel not in Created state");
            duelMe.joinDuel(1000 + i, bytes32(0));

            vm.prank(mallory);
            vm.expectRevert("Duel not in Funded state");
            duelMe.admitDefeat(1000 + i);
        }

        DuelMe.PlayerStats memory s = duelMe.getPlayerStats(mallory);
        assertEq(s.duelsHonored, 0, "no honored counts without a real duel");
        assertEq(s.duelsLost, 0);
        assertEq(s.volume, 0);
        assertEq(usdt.balanceOf(mallory), spentBefore, "and nothing was staked either");
    }

    // ── The formula, pinned across languages ─────────────────────────────

    /// @dev `frontend/src/lib/invite.ts` has to produce the same hash as this contract or a duel
    ///      is joinable by nobody, and the only symptom is "Invalid invite". Both sides assert
    ///      this one vector: the contract here, the TypeScript in `invite.test.ts`. It was
    ///      produced by this contract, not by re-deriving the formula in either test.
    address internal constant GOLDEN_DUELME = 0x990aD70C168B184a84d6d9491303fa344154e317;
    uint256 internal constant GOLDEN_CHAIN_ID = 421614;
    bytes32 internal constant GOLDEN_SECRET = bytes32(uint256(1));
    bytes32 internal constant GOLDEN_HASH = 0xda7c092f120dfd4d9631abd89f76109b95b7d4b5271e33d47ce81102e37abe5f;

    function testInviteHashGoldenVector() public {
        // Same code, at the address and on the chain the vector was taken from.
        vm.etch(GOLDEN_DUELME, address(duelMe).code);
        vm.chainId(GOLDEN_CHAIN_ID);

        assertEq(DuelMe(GOLDEN_DUELME).hashInviteSecret(GOLDEN_SECRET), GOLDEN_HASH);
    }
}
