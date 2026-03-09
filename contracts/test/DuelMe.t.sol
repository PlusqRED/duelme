// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

    uint256 public constant WAGER = 10_000_000; // 10 USDT
    uint256 public constant MIN_WAGER = 3_000_000; // 3 USDT

    function setUp() public {
        usdt = new MockERC20("Tether USD", "USDT", 6);
        duelMe = new DuelMe(address(usdt));

        // Mint USDT to test accounts
        usdt.mint(alice, 1_000_000_000); // 1000 USDT
        usdt.mint(bob, 1_000_000_000);
        usdt.mint(charlie, 1_000_000_000);

        // Approve DuelMe contract
        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);

        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);

        vm.prank(charlie);
        usdt.approve(address(duelMe), type(uint256).max);
    }

    // ---------------------------------------------------------------
    // Helper: create and fund a duel between alice (creator) and bob (opponent)
    // ---------------------------------------------------------------
    function _createAndFundDuel() internal returns (uint256 duelId) {
        vm.prank(alice);
        duelId = duelMe.createDuel(WAGER);

        vm.prank(bob);
        duelMe.joinDuel(duelId);
    }

    // ---------------------------------------------------------------
    // 1. testCreateDuel
    // ---------------------------------------------------------------
    function testCreateDuel() public {
        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER);

        assertEq(duelId, 0, "First duel ID should be 0");
        assertEq(duelMe.duelCount(), 1, "duelCount should be 1");

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.creator, alice, "Creator should be alice");
        assertEq(d.opponent, address(0), "Opponent should be zero");
        assertEq(d.wagerAmount, WAGER, "Wager amount mismatch");
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Created), "State should be Created");

        assertEq(usdt.balanceOf(alice), aliceBalBefore - WAGER, "Alice balance should decrease");
        assertEq(usdt.balanceOf(address(duelMe)), WAGER, "Contract should hold wager");
    }

    // ---------------------------------------------------------------
    // 2. testCreateDuelBelowMinimum
    // ---------------------------------------------------------------
    function testCreateDuelBelowMinimum() public {
        vm.prank(alice);
        vm.expectRevert("Wager below minimum");
        duelMe.createDuel(MIN_WAGER - 1);
    }

    // ---------------------------------------------------------------
    // 3. testJoinDuel
    // ---------------------------------------------------------------
    function testJoinDuel() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER);

        uint256 bobBalBefore = usdt.balanceOf(bob);

        vm.prank(bob);
        duelMe.joinDuel(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.opponent, bob, "Opponent should be bob");
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Funded), "State should be Funded");
        assertEq(usdt.balanceOf(bob), bobBalBefore - WAGER, "Bob balance should decrease");
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2, "Contract should hold both wagers");
    }

    // ---------------------------------------------------------------
    // 4. testJoinDuelSelf
    // ---------------------------------------------------------------
    function testJoinDuelSelf() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER);

        vm.prank(alice);
        vm.expectRevert("Cannot join own duel");
        duelMe.joinDuel(duelId);
    }

    // ---------------------------------------------------------------
    // 5. testClaimVictory
    // ---------------------------------------------------------------
    function testClaimVictory() public {
        uint256 duelId = _createAndFundDuel();

        uint256 claimTime = block.timestamp;
        vm.prank(alice);
        duelMe.claimVictory(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.WinnerClaimed), "State should be WinnerClaimed");
        assertEq(d.claimedWinner, alice, "Claimed winner should be alice");
        assertEq(d.claimedBy, alice, "Claimed by should be alice");
        assertEq(d.claimTimestamp, claimTime, "Claim timestamp mismatch");
    }

    // ---------------------------------------------------------------
    // 6. testAdmitDefeat
    // ---------------------------------------------------------------
    function testAdmitDefeat() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(bob);
        duelMe.admitDefeat(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.WinnerClaimed), "State should be WinnerClaimed");
        assertEq(d.claimedWinner, alice, "Claimed winner should be alice (opponent of bob)");
        assertEq(d.claimedBy, bob, "Claimed by should be bob (the one admitting defeat)");
    }

    // ---------------------------------------------------------------
    // 7. testConfirmResult (full happy path)
    // ---------------------------------------------------------------
    function testConfirmResult() public {
        uint256 duelId = _createAndFundDuel();

        // Alice claims victory
        vm.prank(alice);
        duelMe.claimVictory(duelId);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        // Bob confirms
        vm.prank(bob);
        duelMe.confirmResult(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Resolved), "State should be Resolved");

        // Winner gets 2x wager
        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2, "Alice should receive 2x wager");
        assertEq(usdt.balanceOf(address(duelMe)), 0, "Contract should be empty");

        // Both players get +1 rep
        assertEq(duelMe.getDuelRep(alice), int256(1), "Alice rep should be +1");
        assertEq(duelMe.getDuelRep(bob), int256(1), "Bob rep should be +1");
    }

    // ---------------------------------------------------------------
    // 8. testRefundAfterTimeout
    // ---------------------------------------------------------------
    function testRefundAfterTimeout() public {
        uint256 duelId = _createAndFundDuel();

        // Alice claims victory
        vm.prank(alice);
        duelMe.claimVictory(duelId);

        uint256 aliceBalBefore = usdt.balanceOf(alice);
        uint256 bobBalBefore = usdt.balanceOf(bob);

        // Warp past timeout
        vm.warp(block.timestamp + 3601);

        // Anyone can trigger refund
        vm.prank(charlie);
        duelMe.refund(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded), "State should be Refunded");

        // Both get their wager back
        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER, "Alice should get wager back");
        assertEq(usdt.balanceOf(bob), bobBalBefore + WAGER, "Bob should get wager back");
        assertEq(usdt.balanceOf(address(duelMe)), 0, "Contract should be empty");

        // Alice (claimer) gets +1 rep, Bob (non-responder) gets -3 rep
        assertEq(duelMe.getDuelRep(alice), int256(1), "Alice (claimer) rep should be +1");
        assertEq(duelMe.getDuelRep(bob), int256(-3), "Bob (non-responder) rep should be -3");
    }

    // ---------------------------------------------------------------
    // 9. testRefundBeforeTimeout
    // ---------------------------------------------------------------
    function testRefundBeforeTimeout() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        duelMe.claimVictory(duelId);

        // Try refund before timeout (only warp 30 minutes)
        vm.warp(block.timestamp + 1800);

        vm.expectRevert("Claim timeout not reached");
        duelMe.refund(duelId);
    }

    // ---------------------------------------------------------------
    // 10. testCancelDuel
    // ---------------------------------------------------------------
    function testCancelDuel() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        duelMe.cancelDuel(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(uint256(d.state), uint256(DuelMe.DuelState.Cancelled), "State should be Cancelled");
        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER, "Alice should get wager back");
    }

    // ---------------------------------------------------------------
    // 11. testCancelFundedDuel
    // ---------------------------------------------------------------
    function testCancelFundedDuel() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        vm.expectRevert("Duel not in Created state");
        duelMe.cancelDuel(duelId);
    }

    // ---------------------------------------------------------------
    // 12. testDoubleJoin
    // ---------------------------------------------------------------
    function testDoubleJoin() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER);

        vm.prank(bob);
        duelMe.joinDuel(duelId);

        // Charlie tries to join an already-funded duel
        vm.prank(charlie);
        vm.expectRevert("Duel not in Created state");
        duelMe.joinDuel(duelId);
    }

    // ---------------------------------------------------------------
    // 13. testUnauthorizedClaim
    // ---------------------------------------------------------------
    function testUnauthorizedClaim() public {
        uint256 duelId = _createAndFundDuel();

        // Charlie is not a participant
        vm.prank(charlie);
        vm.expectRevert("Not a participant");
        duelMe.claimVictory(duelId);
    }

    // ---------------------------------------------------------------
    // 14. testDuelRepTracking
    // ---------------------------------------------------------------
    function testDuelRepTracking() public {
        // Scenario 1: Completed duel - both players get +1
        uint256 duel1 = _createAndFundDuel();
        vm.prank(alice);
        duelMe.claimVictory(duel1);
        vm.prank(bob);
        duelMe.confirmResult(duel1);

        assertEq(duelMe.getDuelRep(alice), int256(1), "Alice rep after duel 1");
        assertEq(duelMe.getDuelRep(bob), int256(1), "Bob rep after duel 1");

        // Scenario 2: Another completed duel - cumulative rep
        vm.prank(alice);
        uint256 duel2 = duelMe.createDuel(WAGER);
        vm.prank(bob);
        duelMe.joinDuel(duel2);
        vm.prank(bob);
        duelMe.admitDefeat(duel2);
        vm.prank(alice);
        duelMe.confirmResult(duel2);

        assertEq(duelMe.getDuelRep(alice), int256(2), "Alice rep after duel 2");
        assertEq(duelMe.getDuelRep(bob), int256(2), "Bob rep after duel 2");

        // Scenario 3: Timeout refund - claimer +1, non-responder -3
        vm.prank(alice);
        uint256 duel3 = duelMe.createDuel(WAGER);
        vm.prank(bob);
        duelMe.joinDuel(duel3);
        vm.prank(alice);
        duelMe.claimVictory(duel3);

        vm.warp(block.timestamp + 3601);
        duelMe.refund(duel3);

        // Alice: 2 (previous) + 1 (claimer) = 3
        // Bob: 2 (previous) - 3 (non-responder) = -1
        assertEq(duelMe.getDuelRep(alice), int256(3), "Alice rep after timeout refund");
        assertEq(duelMe.getDuelRep(bob), int256(-1), "Bob rep after timeout refund");
    }

    // ---------------------------------------------------------------
    // Additional edge case tests
    // ---------------------------------------------------------------

    function testConfirmOwnClaimReverts() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        duelMe.claimVictory(duelId);

        // Alice cannot confirm her own claim
        vm.prank(alice);
        vm.expectRevert("Cannot confirm own claim");
        duelMe.confirmResult(duelId);
    }

    function testNonCreatorCannotCancel() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER);

        vm.prank(bob);
        vm.expectRevert("Only creator can cancel");
        duelMe.cancelDuel(duelId);
    }

    function testAdmitDefeatByCreator() public {
        uint256 duelId = _createAndFundDuel();

        // Creator admits defeat, opponent should be the winner
        vm.prank(alice);
        duelMe.admitDefeat(duelId);

        DuelMe.Duel memory d = duelMe.getDuel(duelId);
        assertEq(d.claimedWinner, bob, "Winner should be bob when alice admits defeat");
        assertEq(d.claimedBy, alice, "ClaimedBy should be alice");
    }

    function testConstructorRejectsZeroAddress() public {
        vm.expectRevert("Invalid USDT address");
        new DuelMe(address(0));
    }
}
