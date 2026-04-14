// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Simple ERC20 mock with public mint for testing
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}

contract DuelMeTest is Test {
    DuelMe public duelMe;
    MockERC20 public usdt;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave = makeAddr("dave");

    uint256 public constant WAGER = 10_000_000; // 10 USDT
    uint256 public constant MIN_WAGER = 3_000_000; // 3 USDT
    bytes32 public constant DEFAULT_INVITE_SECRET = bytes32(uint256(1));
    bytes32 public constant DEFAULT_INVITE_HASH = keccak256(abi.encodePacked(DEFAULT_INVITE_SECRET));
    bytes32 public constant OTHER_INVITE_SECRET = bytes32(uint256(2));
    string internal constant UNICODE_MESSAGE = unicode"АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";

    function setUp() public {
        usdt = new MockERC20("Tether USD", "USDT", 6);
        duelMe = new DuelMe(address(usdt));

        // Mint USDT to test accounts
        usdt.mint(alice, 1_000_000_000); // 1000 USDT
        usdt.mint(bob, 1_000_000_000);
        usdt.mint(charlie, 1_000_000_000);
        usdt.mint(dave, 1_000_000_000);

        // Approve DuelMe contract
        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(charlie);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(dave);
        usdt.approve(address(duelMe), type(uint256).max);
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    function _assertStats(address player, uint32 expectedHonored, uint32 expectedAbandoned, string memory label) internal view {
        (uint32 honored, uint32 abandoned) = duelMe.getPlayerStats(player);
        assertEq(honored, expectedHonored, string.concat(label, " - honored"));
        assertEq(abandoned, expectedAbandoned, string.concat(label, " - abandoned"));
    }

    function _assertPayouts(
        uint256 duelId,
        uint256 expectedCreatorPayout,
        uint256 expectedOpponentPayout,
        bool expectedCreatorClaimed,
        bool expectedOpponentClaimed
    ) internal view {
        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.creatorPayout, expectedCreatorPayout, "creator payout");
        assertEq(d.opponentPayout, expectedOpponentPayout, "opponent payout");
        assertEq(d.creatorClaimed, expectedCreatorClaimed, "creator claimed");
        assertEq(d.opponentClaimed, expectedOpponentClaimed, "opponent claimed");
    }

    function _claimPayout(address player, uint256 duelId) internal {
        vm.prank(player);
        duelMe.claimPayout(duelId);
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

    function _createFundClaimAndResolve() internal returns (uint256 duelId) {
        duelId = _createFundAndClaim();
        vm.prank(bob);
        duelMe.confirmResult(duelId);
    }

    function _createFundClaimAndRefund() internal returns (uint256 duelId) {
        duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);
        duelMe.refund(duelId);
    }

    // =====================================================================
    // Constructor
    // =====================================================================

    function testConstructor() public view {
        assertEq(address(duelMe.usdt()), address(usdt));
        assertEq(duelMe.owner(), address(this));
        assertEq(duelMe.duelCount(), 0);
    }

    function testConstructorRejectsZeroAddress() public {
        vm.expectRevert("Invalid USDT address");
        new DuelMe(address(0));
    }

    // =====================================================================
    // createDuel
    // =====================================================================

    function testCreateDuel() public {
        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        assertEq(duelId, 0, "First duel ID should be 0");
        assertEq(duelMe.duelCount(), 1, "duelCount should be 1");

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.creator, alice);
        assertEq(d.opponent, address(0));
        assertEq(d.wagerAmount, WAGER);
        assertEq(d.inviteHash, DEFAULT_INVITE_HASH);
        assertEq(d.message, "");
        assertEq(d.claimedWinner, address(0));
        assertEq(d.claimedBy, address(0));
        assertEq(d.cancelRequestedBy, address(0));
        assertEq(d.createdAt, block.timestamp);
        assertEq(d.fundedAt, 0);
        assertEq(d.cancelRequestedAt, 0);
        assertEq(d.claimTimestamp, 0);
        assertEq(d.finalizedAt, 0);
        assertEq(d.creatorPayout, 0);
        assertEq(d.opponentPayout, 0);
        assertEq(d.creatorClaimed, false);
        assertEq(d.opponentClaimed, false);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Created));

        assertEq(usdt.balanceOf(alice), aliceBalBefore - WAGER);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER);
    }

    function testCreateDuelExactMinimum() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(MIN_WAGER, DEFAULT_INVITE_HASH);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.wagerAmount, MIN_WAGER);
    }

    function testCreateDuelBelowMinimum() public {
        vm.prank(alice);
        vm.expectRevert("Wager below minimum");
        duelMe.createDuel(MIN_WAGER - 1, DEFAULT_INVITE_HASH);
    }

    function testCreateDuelZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("Wager below minimum");
        duelMe.createDuel(0, DEFAULT_INVITE_HASH);
    }

    function testCreateDuelRejectsZeroInviteHash() public {
        vm.prank(alice);
        vm.expectRevert("Invalid invite hash");
        duelMe.createDuel(WAGER, bytes32(0));
    }

    function testCreateDuelLargeWager() public {
        uint256 largeWager = 1_000_000_000_000; // 1M USDT
        usdt.mint(alice, largeWager);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(largeWager, DEFAULT_INVITE_HASH);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.wagerAmount, largeWager);
    }

    function testCreateDuelStoresUnicodeMessage() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH, UNICODE_MESSAGE);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.message, UNICODE_MESSAGE);
    }

    function testCreateDuelRejectsTooManyMessageCodepoints() public {
        vm.prank(alice);
        vm.expectRevert("Message too long");
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH, "123456789012345678901234567890123");
    }

    function testCreateDuelRejectsInvalidUtf8Message() public {
        bytes memory invalidBytes = hex"f0288c28";

        vm.prank(alice);
        vm.expectRevert("Invalid UTF-8");
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH, string(invalidBytes));
    }

    function testCreateDuelInsufficientBalance() public {
        address broke = makeAddr("broke");
        usdt.mint(broke, WAGER - 1);
        vm.prank(broke);
        usdt.approve(address(duelMe), type(uint256).max);

        vm.prank(broke);
        vm.expectRevert();
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
    }

    function testCreateDuelNoApproval() public {
        address noApproval = makeAddr("noApproval");
        usdt.mint(noApproval, WAGER);
        // No approve call

        vm.prank(noApproval);
        vm.expectRevert();
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
    }

    function testCreateDuelIncrementsId() public {
        vm.prank(alice);
        uint256 id0 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(alice);
        uint256 id1 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        uint256 id2 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(duelMe.duelCount(), 3);
    }

    function testCreateDuelEmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit DuelMe.DuelCreated(0, alice, WAGER);
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
    }

    // =====================================================================
    // joinDuel
    // =====================================================================

    function testJoinDuel() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        uint256 bobBalBefore = usdt.balanceOf(bob);

        vm.warp(block.timestamp + 15);
        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.opponent, bob);
        assertEq(d.fundedAt, block.timestamp);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Funded));
        assertEq(usdt.balanceOf(bob), bobBalBefore - WAGER);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
    }

    function testJoinDuelSelf() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        vm.expectRevert("Cannot join own duel");
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testJoinDuelAlreadyFunded() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(charlie);
        vm.expectRevert("Duel not in Created state");
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testJoinDuelCancelled() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(alice);
        duelMe.cancelDuel(duelId);

        vm.prank(bob);
        vm.expectRevert("Duel not in Created state");
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testJoinDuelResolved() public {
        uint256 duelId = _createFundClaimAndResolve();

        vm.prank(charlie);
        vm.expectRevert("Duel not in Created state");
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testJoinDuelNoApproval() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        address noApproval = makeAddr("noApproval");
        usdt.mint(noApproval, WAGER);

        vm.prank(noApproval);
        vm.expectRevert();
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testJoinDuelInvalidInviteReverts() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(bob);
        vm.expectRevert("Invalid invite");
        duelMe.joinDuel(duelId, OTHER_INVITE_SECRET);
    }

    function testJoinDuelEmitsEvent() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit DuelMe.DuelJoined(duelId, bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    // =====================================================================
    // declineDuel
    // =====================================================================

    function testDeclineDuel() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(bob);
        duelMe.declineDuel(duelId, DEFAULT_INVITE_SECRET);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.opponent, bob);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Declined));
        assertEq(usdt.balanceOf(alice), aliceBalBefore);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER);
        _assertPayouts(duelId, WAGER, 0, false, false);

        _claimPayout(alice, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
        assertEq(usdt.balanceOf(address(duelMe)), 0);
        _assertPayouts(duelId, WAGER, 0, true, false);
    }

    function testDeclineDuelCreatorReverts() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        vm.expectRevert("Creator cannot decline");
        duelMe.declineDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testDeclineDuelInvalidInviteReverts() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(bob);
        vm.expectRevert("Invalid invite");
        duelMe.declineDuel(duelId, OTHER_INVITE_SECRET);
    }

    function testDeclineDuelWrongStateReverts() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(charlie);
        vm.expectRevert("Duel not in Created state");
        duelMe.declineDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testDeclineDuelDoesNotAffectStats() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(bob);
        duelMe.declineDuel(duelId, DEFAULT_INVITE_SECRET);

        _assertStats(alice, 0, 0, "Alice after decline");
        _assertStats(bob, 0, 0, "Bob after decline");
    }

    function testDeclineDuelEmitsEvent() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit DuelMe.DuelDeclined(duelId, bob);
        duelMe.declineDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    // =====================================================================
    // claimVictory
    // =====================================================================

    function testClaimVictoryByCreator() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        duelMe.claimVictory(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.WinnerClaimed));
        assertEq(d.claimedWinner, alice);
        assertEq(d.claimedBy, alice);
        assertEq(d.claimTimestamp, block.timestamp);
    }

    function testClaimVictoryByOpponent() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(bob);
        duelMe.claimVictory(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.claimedWinner, bob);
        assertEq(d.claimedBy, bob);
    }

    function testClaimVictoryNotParticipant() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(charlie);
        vm.expectRevert("Not a participant");
        duelMe.claimVictory(duelId);
    }

    function testClaimVictoryNotFunded() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        vm.expectRevert("Duel not in Funded state");
        duelMe.claimVictory(duelId);
    }

    function testClaimVictoryAlreadyClaimed() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        vm.expectRevert("Duel not in Funded state");
        duelMe.claimVictory(duelId);
    }

    function testClaimVictoryOnResolved() public {
        uint256 duelId = _createFundClaimAndResolve();

        vm.prank(alice);
        vm.expectRevert("Duel not in Funded state");
        duelMe.claimVictory(duelId);
    }

    function testClaimVictoryOnRefunded() public {
        uint256 duelId = _createFundClaimAndRefund();

        vm.prank(alice);
        vm.expectRevert("Duel not in Funded state");
        duelMe.claimVictory(duelId);
    }

    function testClaimVictoryEmitsEvent() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit DuelMe.VictoryClaimed(duelId, alice, alice);
        duelMe.claimVictory(duelId);
    }

    // =====================================================================
    // admitDefeat
    // =====================================================================

    function testAdmitDefeatByOpponent() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(bob);
        duelMe.admitDefeat(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.claimedWinner, alice);
        assertEq(d.claimedBy, bob);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.WinnerClaimed));
    }

    function testAdmitDefeatByCreator() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        duelMe.admitDefeat(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.claimedWinner, bob);
        assertEq(d.claimedBy, alice);
    }

    function testAdmitDefeatNotParticipant() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(charlie);
        vm.expectRevert("Not a participant");
        duelMe.admitDefeat(duelId);
    }

    function testAdmitDefeatNotFunded() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        vm.expectRevert("Duel not in Funded state");
        duelMe.admitDefeat(duelId);
    }

    function testAdmitDefeatAlreadyClaimed() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        vm.expectRevert("Duel not in Funded state");
        duelMe.admitDefeat(duelId);
    }

    function testAdmitDefeatEmitsEvent() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit DuelMe.VictoryClaimed(duelId, bob, alice);
        duelMe.admitDefeat(duelId);
    }

    // =====================================================================
    // confirmResult
    // =====================================================================

    function testConfirmResultAfterClaimVictory() public {
        uint256 duelId = _createFundAndClaim();

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(bob);
        duelMe.confirmResult(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Resolved));
        assertEq(usdt.balanceOf(alice), aliceBalBefore);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
        _assertPayouts(duelId, WAGER * 2, 0, false, false);

        _claimPayout(alice, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2);
        assertEq(usdt.balanceOf(address(duelMe)), 0);
        _assertPayouts(duelId, WAGER * 2, 0, true, false);

        _assertStats(alice, 1, 0, "Alice");
        _assertStats(bob, 1, 0, "Bob");
    }

    function testConfirmResultAfterAdmitDefeat() public {
        uint256 duelId = _createAndFundDuel();

        // Bob admits defeat → alice is claimed winner
        vm.prank(bob);
        duelMe.admitDefeat(duelId);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        // Alice confirms (she is the other participant)
        vm.prank(alice);
        duelMe.confirmResult(duelId);

        _assertPayouts(duelId, WAGER * 2, 0, false, false);

        _claimPayout(alice, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2);
        _assertStats(alice, 1, 0, "Alice");
        _assertStats(bob, 1, 0, "Bob");
    }

    function testConfirmResultOpponentClaimsVictory() public {
        uint256 duelId = _createAndFundDuel();

        // Bob (opponent) claims victory
        vm.prank(bob);
        duelMe.claimVictory(duelId);

        uint256 bobBalBefore = usdt.balanceOf(bob);

        // Alice confirms
        vm.prank(alice);
        duelMe.confirmResult(duelId);

        _assertPayouts(duelId, 0, WAGER * 2, false, false);

        _claimPayout(bob, duelId);

        assertEq(usdt.balanceOf(bob), bobBalBefore + WAGER * 2);
    }

    function testConfirmOwnClaimReverts() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(alice);
        vm.expectRevert("Cannot confirm own claim");
        duelMe.confirmResult(duelId);
    }

    function testConfirmResultNotParticipant() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(charlie);
        vm.expectRevert("Not a participant");
        duelMe.confirmResult(duelId);
    }

    function testConfirmResultWrongState() public {
        // Created state
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.confirmResult(duelId);

        // Funded state
        uint256 duelId2 = _createAndFundDuel();
        vm.prank(bob);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.confirmResult(duelId2);
    }

    function testConfirmResultOnResolved() public {
        uint256 duelId = _createFundClaimAndResolve();

        vm.prank(bob);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.confirmResult(duelId);
    }

    function testConfirmResultOnRefunded() public {
        uint256 duelId = _createFundClaimAndRefund();

        vm.prank(bob);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.confirmResult(duelId);
    }

    function testConfirmResultEmitsEvent() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit DuelMe.DuelResolved(duelId, alice, WAGER * 2);
        duelMe.confirmResult(duelId);
    }

    // =====================================================================
    // disputeResult
    // =====================================================================

    function testDisputeResultRefundsBothPlayers() public {
        uint256 duelId = _createFundAndClaim();

        uint256 aliceBalBefore = usdt.balanceOf(alice);
        uint256 bobBalBefore = usdt.balanceOf(bob);

        vm.prank(bob);
        duelMe.disputeResult(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Disputed));
        assertEq(usdt.balanceOf(alice), aliceBalBefore);
        assertEq(usdt.balanceOf(bob), bobBalBefore);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
        _assertPayouts(duelId, WAGER, WAGER, false, false);

        _claimPayout(alice, duelId);
        _claimPayout(bob, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
        assertEq(usdt.balanceOf(bob), bobBalBefore + WAGER);
        assertEq(usdt.balanceOf(address(duelMe)), 0);
        _assertPayouts(duelId, WAGER, WAGER, true, true);

        _assertStats(alice, 0, 0, "Alice after dispute");
        _assertStats(bob, 0, 0, "Bob after dispute");
    }

    function testDisputeResultByClaimerReverts() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(alice);
        vm.expectRevert("Cannot dispute own claim");
        duelMe.disputeResult(duelId);
    }

    function testDisputeResultNotParticipantReverts() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(charlie);
        vm.expectRevert("Not a participant");
        duelMe.disputeResult(duelId);
    }

    function testDisputeResultWrongStateReverts() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(bob);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.disputeResult(duelId);
    }

    function testDisputeResultEmitsEvent() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit DuelMe.DuelDisputed(duelId, bob);
        duelMe.disputeResult(duelId);
    }

    // =====================================================================
    // refund
    // =====================================================================

    function testRefundAfterTimeout() public {
        uint256 duelId = _createFundAndClaim();

        uint256 aliceBalBefore = usdt.balanceOf(alice);
        uint256 bobBalBefore = usdt.balanceOf(bob);

        vm.warp(block.timestamp + 3601);

        vm.prank(charlie); // anyone can trigger
        duelMe.refund(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded));
        assertEq(usdt.balanceOf(alice), aliceBalBefore);
        assertEq(usdt.balanceOf(bob), bobBalBefore);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
        _assertPayouts(duelId, WAGER, WAGER, false, false);

        _claimPayout(alice, duelId);
        _claimPayout(bob, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
        assertEq(usdt.balanceOf(bob), bobBalBefore + WAGER);
        assertEq(usdt.balanceOf(address(duelMe)), 0);
        _assertPayouts(duelId, WAGER, WAGER, true, true);

        // Alice was claimer → honored; Bob non-responder → abandoned
        _assertStats(alice, 1, 0, "Alice (claimer)");
        _assertStats(bob, 0, 1, "Bob (non-responder)");
    }

    function testRefundOpponentIsClaimer() public {
        uint256 duelId = _createAndFundDuel();

        // Bob claims victory this time
        vm.prank(bob);
        duelMe.claimVictory(duelId);

        vm.warp(block.timestamp + 3601);
        duelMe.refund(duelId);

        // Bob was claimer → honored; Alice non-responder → abandoned
        _assertStats(bob, 1, 0, "Bob (claimer)");
        _assertStats(alice, 0, 1, "Alice (non-responder)");
    }

    function testRefundExactTimeout() public {
        uint256 duelId = _createFundAndClaim();

        // Warp to exactly CLAIM_TIMEOUT (should succeed)
        vm.warp(block.timestamp + 3600);
        duelMe.refund(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded));
    }

    function testRefundBeforeTimeout() public {
        uint256 duelId = _createFundAndClaim();

        vm.warp(block.timestamp + 3599);

        vm.expectRevert("Claim timeout not reached");
        duelMe.refund(duelId);
    }

    function testRefundWrongState() public {
        // Created
        vm.prank(alice);
        uint256 id1 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.refund(id1);

        // Funded
        uint256 id2 = _createAndFundDuel();
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.refund(id2);
    }

    function testRefundOnResolved() public {
        uint256 duelId = _createFundClaimAndResolve();

        vm.warp(block.timestamp + 3601);
        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.refund(duelId);
    }

    function testRefundDoubleCallReverts() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);

        duelMe.refund(duelId);

        vm.expectRevert("Duel not in WinnerClaimed state");
        duelMe.refund(duelId);
    }

    function testRefundEmitsEvent() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);

        vm.expectEmit(true, false, false, true);
        emit DuelMe.DuelRefunded(duelId);
        duelMe.refund(duelId);
    }

    // =====================================================================
    // cancelDuel
    // =====================================================================

    function testCancelDuel() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        duelMe.cancelDuel(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Cancelled));
        _assertPayouts(duelId, WAGER, 0, false, false);
        assertEq(usdt.balanceOf(alice), aliceBalBefore);

        _claimPayout(alice, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
    }

    function testCancelDuelNotCreator() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(bob);
        vm.expectRevert("Only creator can cancel");
        duelMe.cancelDuel(duelId);
    }

    function testCancelDuelFunded() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        vm.expectRevert("Duel not in Created state");
        duelMe.cancelDuel(duelId);
    }

    function testCancelDuelWinnerClaimed() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(alice);
        vm.expectRevert("Duel not in Created state");
        duelMe.cancelDuel(duelId);
    }

    function testCancelDuelAlreadyCancelled() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(alice);
        duelMe.cancelDuel(duelId);

        vm.prank(alice);
        vm.expectRevert("Duel not in Created state");
        duelMe.cancelDuel(duelId);
    }

    function testCancelDoesNotAffectStats() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(alice);
        duelMe.cancelDuel(duelId);

        _assertStats(alice, 0, 0, "Alice after cancel");
    }

    function testCancelEmitsEvent() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit DuelMe.DuelCancelled(duelId);
        duelMe.cancelDuel(duelId);
    }

    // =====================================================================
    // PlayerStats tracking
    // =====================================================================

    function testNewPlayerStatsAreZero() public view {
        _assertStats(charlie, 0, 0, "Charlie (no duels)");
    }

    function testPlayerStatsCumulative() public {
        // Duel 1: normal resolve
        uint256 duel1 = _createAndFundDuel();
        vm.prank(alice);
        duelMe.claimVictory(duel1);
        vm.prank(bob);
        duelMe.confirmResult(duel1);

        _assertStats(alice, 1, 0, "Alice after duel 1");
        _assertStats(bob, 1, 0, "Bob after duel 1");

        // Duel 2: admit defeat + confirm
        vm.prank(alice);
        uint256 duel2 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        duelMe.joinDuel(duel2, DEFAULT_INVITE_SECRET);
        vm.prank(bob);
        duelMe.admitDefeat(duel2);
        vm.prank(alice);
        duelMe.confirmResult(duel2);

        _assertStats(alice, 2, 0, "Alice after duel 2");
        _assertStats(bob, 2, 0, "Bob after duel 2");

        // Duel 3: timeout refund
        vm.prank(alice);
        uint256 duel3 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        duelMe.joinDuel(duel3, DEFAULT_INVITE_SECRET);
        vm.prank(alice);
        duelMe.claimVictory(duel3);
        vm.warp(block.timestamp + 3601);
        duelMe.refund(duel3);

        _assertStats(alice, 3, 0, "Alice after duel 3 (claimer)");
        _assertStats(bob, 2, 1, "Bob after duel 3 (non-responder)");
    }

    function testPlayerStatsIndependentPerPlayer() public {
        // Alice vs Bob: normal resolve
        uint256 duel1 = _createAndFundDuel();
        vm.prank(alice);
        duelMe.claimVictory(duel1);
        vm.prank(bob);
        duelMe.confirmResult(duel1);

        // Charlie vs Dave: timeout refund (charlie claims, dave doesn't respond)
        vm.prank(charlie);
        uint256 duel2 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(dave);
        duelMe.joinDuel(duel2, DEFAULT_INVITE_SECRET);
        vm.prank(charlie);
        duelMe.claimVictory(duel2);
        vm.warp(block.timestamp + 3601);
        duelMe.refund(duel2);

        // Stats are independent
        _assertStats(alice, 1, 0, "Alice");
        _assertStats(bob, 1, 0, "Bob");
        _assertStats(charlie, 1, 0, "Charlie (claimer)");
        _assertStats(dave, 0, 1, "Dave (non-responder)");
    }

    // =====================================================================
    // Pausable
    // =====================================================================

    function testPauseByOwner() public {
        duelMe.pause();
        assertTrue(duelMe.paused());
    }

    function testUnpauseByOwner() public {
        duelMe.pause();
        duelMe.unpause();
        assertFalse(duelMe.paused());
    }

    function testPauseByNonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        duelMe.pause();
    }

    function testUnpauseByNonOwnerReverts() public {
        duelMe.pause();

        vm.prank(alice);
        vm.expectRevert();
        duelMe.unpause();
    }

    function testCreateDuelWhenPausedReverts() public {
        duelMe.pause();

        vm.prank(alice);
        vm.expectRevert();
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
    }

    function testJoinDuelWhenPausedReverts() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        duelMe.pause();

        vm.prank(bob);
        vm.expectRevert();
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testDeclineDuelWhenPausedReverts() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        duelMe.pause();

        vm.prank(bob);
        vm.expectRevert();
        duelMe.declineDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    function testClaimVictoryWhenPausedReverts() public {
        uint256 duelId = _createAndFundDuel();
        duelMe.pause();

        vm.prank(alice);
        vm.expectRevert();
        duelMe.claimVictory(duelId);
    }

    function testAdmitDefeatWhenPausedReverts() public {
        uint256 duelId = _createAndFundDuel();
        duelMe.pause();

        vm.prank(bob);
        vm.expectRevert();
        duelMe.admitDefeat(duelId);
    }

    function testConfirmResultWhenPausedReverts() public {
        uint256 duelId = _createFundAndClaim();
        duelMe.pause();

        vm.prank(bob);
        vm.expectRevert();
        duelMe.confirmResult(duelId);
    }

    function testDisputeResultWhenPausedReverts() public {
        uint256 duelId = _createFundAndClaim();
        duelMe.pause();

        vm.prank(bob);
        vm.expectRevert();
        duelMe.disputeResult(duelId);
    }

    function testRefundWhenPausedReverts() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);
        duelMe.pause();

        vm.expectRevert();
        duelMe.refund(duelId);
    }

    function testCancelDuelWhenPausedReverts() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        duelMe.pause();

        vm.prank(alice);
        vm.expectRevert();
        duelMe.cancelDuel(duelId);
    }

    function testUnpauseRestoresFunctionality() public {
        duelMe.pause();
        duelMe.unpause();

        // Should work after unpause
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        assertEq(duelMe.duelCount(), 1);

        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Funded));
    }

    // =====================================================================
    // getDuel / view functions
    // =====================================================================

    function testGetDuelNonexistent() public view {
        DuelMe.Duel memory d = duelMe.getDuel(999);
        assertEq(d.creator, address(0));
        assertEq(d.wagerAmount, 0);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Created)); // default is 0
    }

    function testConstants() public view {
        assertEq(duelMe.MIN_WAGER(), 3_000_000);
        assertEq(duelMe.CLAIM_TIMEOUT(), 3600);
    }

    // =====================================================================
    // Multiple concurrent duels
    // =====================================================================

    function testConcurrentDuelsDoNotInterfere() public {
        // Duel 0: alice vs bob
        vm.prank(alice);
        uint256 duel0 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        duelMe.joinDuel(duel0, DEFAULT_INVITE_SECRET);

        // Duel 1: charlie vs dave
        vm.prank(charlie);
        uint256 duel1 = duelMe.createDuel(WAGER * 2, DEFAULT_INVITE_HASH);
        vm.prank(dave);
        duelMe.joinDuel(duel1, DEFAULT_INVITE_SECRET);

        // Resolve duel 0
        vm.prank(alice);
        duelMe.claimVictory(duel0);
        vm.prank(bob);
        duelMe.confirmResult(duel0);

        // Duel 1 should still be Funded
        DuelMe.Duel memory d1 = duelMe.getDuel(duel1);
        assertEq(uint256(d1.state), uint256(DuelMe.DuelState.Funded));

        // Resolve duel 1
        vm.prank(dave);
        duelMe.admitDefeat(duel1);
        vm.prank(charlie);
        duelMe.confirmResult(duel1);

        // Verify payouts are correct
        DuelMe.Duel memory d0 = duelMe.getDuel(duel0);
        assertEq(uint256(d0.state), uint256(DuelMe.DuelState.Resolved));
        d1 = duelMe.getDuel(duel1);
        assertEq(uint256(d1.state), uint256(DuelMe.DuelState.Resolved));
        _assertPayouts(duel0, WAGER * 2, 0, false, false);
        _assertPayouts(duel1, WAGER * 4, 0, false, false);

        _claimPayout(alice, duel0);
        _claimPayout(charlie, duel1);

        assertEq(usdt.balanceOf(address(duelMe)), 0, "Contract should be empty");
    }

    // =====================================================================
    // Full lifecycle: admit defeat → other player confirms
    // =====================================================================

    function testFullFlowAdmitDefeatThenConfirm() public {
        uint256 duelId = _createAndFundDuel();
        uint256 aliceBalBefore = usdt.balanceOf(alice);

        // Bob admits defeat → alice wins
        vm.prank(bob);
        duelMe.admitDefeat(duelId);

        // Alice (the other player) confirms
        vm.prank(alice);
        duelMe.confirmResult(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Resolved));
        assertEq(d.claimedWinner, alice);
        _assertPayouts(duelId, WAGER * 2, 0, false, false);

        _claimPayout(alice, duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2);
    }

    // =====================================================================
    // Full lifecycle: claim → timeout → refund with opponent as claimer
    // =====================================================================

    function testFullFlowOpponentClaimsTimeout() public {
        uint256 duelId = _createAndFundDuel();

        uint256 aliceBalBefore = usdt.balanceOf(alice);
        uint256 bobBalBefore = usdt.balanceOf(bob);

        // Bob claims victory
        vm.prank(bob);
        duelMe.claimVictory(duelId);

        // Alice doesn't respond, timeout
        vm.warp(block.timestamp + 3601);
        duelMe.refund(duelId);

        _assertPayouts(duelId, WAGER, WAGER, false, false);

        _claimPayout(alice, duelId);
        _claimPayout(bob, duelId);

        // Both get money back
        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
        assertEq(usdt.balanceOf(bob), bobBalBefore + WAGER);

        // Bob (claimer) → honored, Alice (non-responder) → abandoned
        _assertStats(bob, 1, 0, "Bob (claimer)");
        _assertStats(alice, 0, 1, "Alice (non-responder)");
    }

    // =====================================================================
    // Contract balance integrity
    // =====================================================================

    function testContractBalanceAfterMultipleOperations() public {
        // Create 3 duels
        vm.prank(alice);
        uint256 d0 = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(alice);
        uint256 d1 = duelMe.createDuel(WAGER * 2, DEFAULT_INVITE_HASH);
        vm.prank(alice);
        uint256 d2 = duelMe.createDuel(WAGER * 3, DEFAULT_INVITE_HASH);

        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 6);

        // Cancel d2
        vm.prank(alice);
        duelMe.cancelDuel(d2);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 6);
        _assertPayouts(d2, WAGER * 3, 0, false, false);

        // Fund d0
        vm.prank(bob);
        duelMe.joinDuel(d0, DEFAULT_INVITE_SECRET);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 7);

        // Resolve d0
        vm.prank(alice);
        duelMe.claimVictory(d0);
        vm.prank(bob);
        duelMe.confirmResult(d0);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 7);
        _assertPayouts(d0, WAGER * 2, 0, false, false);

        // Fund d1 and refund
        vm.prank(charlie);
        duelMe.joinDuel(d1, DEFAULT_INVITE_SECRET);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 9);

        vm.prank(alice);
        duelMe.claimVictory(d1);
        vm.warp(block.timestamp + 3601);
        duelMe.refund(d1);

        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 9);
        _assertPayouts(d1, WAGER * 2, WAGER * 2, false, false);

        uint256 aliceBalBefore = usdt.balanceOf(alice);
        uint256 charlieBalBefore = usdt.balanceOf(charlie);

        uint256[] memory aliceClaims = new uint256[](3);
        aliceClaims[0] = d2;
        aliceClaims[1] = d0;
        aliceClaims[2] = d1;
        vm.prank(alice);
        duelMe.claimPayouts(aliceClaims);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 7);
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);

        _claimPayout(charlie, d1);

        assertEq(usdt.balanceOf(charlie), charlieBalBefore + WAGER * 2);
        assertEq(usdt.balanceOf(address(duelMe)), 0, "Contract should be fully drained");
    }

    // =====================================================================
    // refundAndClaimPayouts
    // =====================================================================

    function testRefundAndClaimPayoutsSingleDuel() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        uint256[] memory ids = new uint256[](1);
        ids[0] = duelId;

        vm.prank(alice);
        duelMe.refundAndClaimPayouts(ids);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER, "Alice should receive her wager back");
        assertEq(usdt.balanceOf(address(duelMe)), WAGER, "Contract holds bob's unclaimed share");

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded));
        assertEq(d.creatorClaimed, true);
        assertEq(d.opponentClaimed, false);

        // Alice (claimer) honored; Bob (non-responder) abandoned
        _assertStats(alice, 1, 0, "Alice (claimer)");
        _assertStats(bob, 0, 1, "Bob (non-responder)");
    }

    function testRefundAndClaimPayoutsMultipleDuels() public {
        // Duel 1: alice creates, bob joins, alice claims victory → alice is claimer
        uint256 duel1 = _createFundAndClaim();

        // Duel 2: bob creates with OTHER_INVITE_SECRET hash, alice joins, bob claims victory → bob is claimer
        bytes32 otherHash = keccak256(abi.encodePacked(OTHER_INVITE_SECRET));
        vm.prank(bob);
        uint256 duel2 = duelMe.createDuel(WAGER, otherHash);
        vm.prank(alice);
        duelMe.joinDuel(duel2, OTHER_INVITE_SECRET);
        vm.prank(bob);
        duelMe.claimVictory(duel2);

        // Warp past timeout so both duels are eligible for refund
        vm.warp(block.timestamp + 3601);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        uint256[] memory ids = new uint256[](2);
        ids[0] = duel1;
        ids[1] = duel2;

        // Alice calls: she is creator of duel1 (gets WAGER back) and opponent of duel2 (gets WAGER back)
        vm.prank(alice);
        duelMe.refundAndClaimPayouts(ids);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2, "Alice claims from both duels");

        DuelMe.Duel memory d1 = duelMe.getDuel(duel1);
        assertEq(uint256(d1.state), uint256(DuelMe.DuelState.Refunded));
        DuelMe.Duel memory d2 = duelMe.getDuel(duel2);
        assertEq(uint256(d2.state), uint256(DuelMe.DuelState.Refunded));
    }

    function testRefundAndClaimPayoutsSkipsAlreadyRefunded() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);

        // Refund separately first
        duelMe.refund(duelId);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        uint256[] memory ids = new uint256[](1);
        ids[0] = duelId;

        // refundAndClaimPayouts: refund step skipped (already Refunded), claim step succeeds
        vm.prank(alice);
        duelMe.refundAndClaimPayouts(ids);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER, "Alice still claims her share");

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded));
        assertEq(d.creatorClaimed, true);
    }

    function testRefundAndClaimPayoutsSkipsNotTimedOut() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 1800); // only 30 min passed, not timed out

        uint256[] memory ids = new uint256[](1);
        ids[0] = duelId;

        vm.prank(alice);
        vm.expectRevert("Nothing to claim");
        duelMe.refundAndClaimPayouts(ids);

        // State should still be WinnerClaimed (nothing changed)
        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.WinnerClaimed));
    }

    function testRefundAndClaimPayoutsNonParticipantGetsNothing() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);

        uint256[] memory ids = new uint256[](1);
        ids[0] = duelId;

        // Charlie is not a participant: refund step executes (permissionless), claim step yields 0
        vm.prank(charlie);
        vm.expectRevert("Nothing to claim");
        duelMe.refundAndClaimPayouts(ids);

        // Even though the call reverted, check the duel was NOT refunded yet
        // (the revert rolls back all state changes in the call)
        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.WinnerClaimed), "Revert rolls back refund");
    }

    function testRefundAndClaimPayoutsEmptyArrayReverts() public {
        uint256[] memory ids = new uint256[](0);

        vm.prank(alice);
        vm.expectRevert("Nothing to claim");
        duelMe.refundAndClaimPayouts(ids);
    }

    function testRefundAndClaimPayoutsWhenPausedReverts() public {
        uint256 duelId = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);
        duelMe.pause();

        uint256[] memory ids = new uint256[](1);
        ids[0] = duelId;

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        duelMe.refundAndClaimPayouts(ids);
    }

    function testRefundAndClaimPayoutsMixedStates() public {
        // id1: timed-out WinnerClaimed duel (alice is claimer/creator)
        uint256 id1 = _createFundAndClaim();
        vm.warp(block.timestamp + 3601);

        // id2: already fully resolved duel where alice won (2*WAGER payout)
        uint256 id2 = _createFundClaimAndResolve();

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        uint256[] memory ids = new uint256[](2);
        ids[0] = id1;
        ids[1] = id2;

        // id1 gets refunded and alice claims WAGER; id2 already Resolved, alice claims 2*WAGER
        vm.prank(alice);
        duelMe.refundAndClaimPayouts(ids);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 3, "Alice receives WAGER (refund) + 2*WAGER (resolve)");

        DuelMe.Duel memory d1 = duelMe.getDuel(id1);
        assertEq(uint256(d1.state), uint256(DuelMe.DuelState.Refunded));
        assertEq(d1.creatorClaimed, true);

        DuelMe.Duel memory d2 = duelMe.getDuel(id2);
        assertEq(uint256(d2.state), uint256(DuelMe.DuelState.Resolved));
        assertEq(d2.creatorClaimed, true);
    }
}
