// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./helpers/DuelMeFixture.sol";

contract DuelMeAdminConfigTest is DuelMeFixture {
    function setUp() public {
        _deployFixture();
    }

    // =====================================================================
    // setMinWager
    // =====================================================================

    function testSetMinWager() public {
        vm.expectEmit(false, false, false, true);
        emit DuelMe.MinWagerUpdated(MIN_WAGER, 5_000_000);
        duelMe.setMinWager(5_000_000);
        assertEq(duelMe.minWager(), 5_000_000);
    }

    function testSetMinWagerRejectsBelowFloor() public {
        vm.expectRevert("Below minimum");
        duelMe.setMinWager(100_000 - 1);
    }

    function testSetMinWagerAcceptsFloor() public {
        duelMe.setMinWager(100_000);
        assertEq(duelMe.minWager(), 100_000);
    }

    function testSetMinWagerOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.setMinWager(100_000);
    }

    function testCreateDuelRespectsUpdatedMinWager() public {
        duelMe.setMinWager(5_000_000);

        vm.prank(alice);
        vm.expectRevert("Wager below minimum");
        duelMe.createDuel(5_000_000 - 1, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        duelMe.createDuel(5_000_000, DEFAULT_INVITE_HASH);
    }

    // =====================================================================
    // setClaimTimeout
    // =====================================================================

    function testSetClaimTimeout() public {
        vm.expectEmit(false, false, false, true);
        emit DuelMe.ClaimTimeoutUpdated(1 hours, 2 hours);
        duelMe.setClaimTimeout(2 hours);
        assertEq(duelMe.claimTimeout(), 2 hours);
    }

    function testSetClaimTimeoutRejectsBelowFloor() public {
        vm.expectRevert("Below minimum");
        duelMe.setClaimTimeout(1 hours - 1);
    }

    function testSetClaimTimeoutOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.setClaimTimeout(2 hours);
    }

    function testRefundRespectsUpdatedClaimTimeout() public {
        duelMe.setClaimTimeout(2 hours);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(MIN_WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
        vm.prank(alice);
        duelMe.claimVictory(duelId);

        vm.warp(block.timestamp + 1 hours);
        vm.expectRevert("Claim timeout not reached");
        duelMe.refund(duelId);

        vm.warp(block.timestamp + 1 hours);
        duelMe.refund(duelId);
    }

    // =====================================================================
    // setEmergencyDelay
    // =====================================================================

    function testSetEmergencyDelay() public {
        vm.expectEmit(false, false, false, true);
        emit DuelMe.EmergencyDelayUpdated(30 days, 60 days);
        duelMe.setEmergencyDelay(60 days);
        assertEq(duelMe.emergencyDelay(), 60 days);
    }

    function testSetEmergencyDelayRejectsBelowFloor() public {
        vm.expectRevert("Below minimum");
        duelMe.setEmergencyDelay(30 days - 1);
    }

    function testSetEmergencyDelayOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.setEmergencyDelay(60 days);
    }

    function testEmergencyWithdrawRespectsUpdatedDelay() public {
        duelMe.setEmergencyDelay(60 days);
        usdt.mint(address(duelMe), 1_000_000);

        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), address(this), 1_000_000);

        vm.warp(block.timestamp + 30 days);
        vm.expectRevert("Timelock not expired");
        duelMe.executeEmergencyWithdraw(requestId);

        vm.warp(block.timestamp + 30 days);
        duelMe.executeEmergencyWithdraw(requestId);
        assertEq(usdt.balanceOf(address(this)), 1_000_000);
    }

    // =====================================================================
    // setMaxMessageCodepoints / setMaxMessageBytes
    // =====================================================================

    function testSetMaxMessageCodepoints() public {
        vm.expectEmit(false, false, false, true);
        emit DuelMe.MaxMessageCodepointsUpdated(32, 64);
        duelMe.setMaxMessageCodepoints(64);
        assertEq(duelMe.maxMessageCodepoints(), 64);
    }

    function testSetMaxMessageCodepointsRejectsBelowFloor() public {
        vm.expectRevert("Below minimum");
        duelMe.setMaxMessageCodepoints(31);
    }

    function testSetMaxMessageCodepointsOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.setMaxMessageCodepoints(64);
    }

    function testSetMaxMessageBytes() public {
        vm.expectEmit(false, false, false, true);
        emit DuelMe.MaxMessageBytesUpdated(128, 256);
        duelMe.setMaxMessageBytes(256);
        assertEq(duelMe.maxMessageBytes(), 256);
    }

    function testSetMaxMessageBytesRejectsBelowFloor() public {
        vm.expectRevert("Below minimum");
        duelMe.setMaxMessageBytes(127);
    }

    function testSetMaxMessageBytesOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.setMaxMessageBytes(256);
    }

    function testMessageValidationRespectsUpdatedLimits() public {
        string memory message = _repeatA(33); // 33 code points, 33 bytes

        vm.prank(alice);
        vm.expectRevert("Message too long");
        duelMe.createDuel(MIN_WAGER, DEFAULT_INVITE_HASH, message);

        duelMe.setMaxMessageCodepoints(64);
        vm.prank(alice);
        duelMe.createDuel(MIN_WAGER, DEFAULT_INVITE_HASH, message);

        string memory longMessage = _repeatA(129); // exceeds 128 bytes
        duelMe.setMaxMessageCodepoints(256);
        vm.prank(alice);
        vm.expectRevert("Message too long");
        duelMe.createDuel(MIN_WAGER, DEFAULT_INVITE_HASH, longMessage);

        duelMe.setMaxMessageBytes(256);
        vm.prank(alice);
        duelMe.createDuel(MIN_WAGER, DEFAULT_INVITE_HASH, longMessage);
    }

    function _repeatA(uint256 count) internal pure returns (string memory) {
        bytes memory buf = new bytes(count);
        for (uint256 i = 0; i < count; i++) {
            buf[i] = "a";
        }
        return string(buf);
    }

    // =====================================================================
    // setDuelCreationPaused
    // =====================================================================

    /// @dev The migration switch: creation stops, everything already in flight keeps running.
    ///      Without this, moving to a successor contract means either a full pause (which would
    ///      strand funded duels) or leaving the old address open for new money indefinitely.
    function testDuelCreationPausedBlocksOnlyCreation() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        duelMe.setDuelCreationPaused(true);

        vm.prank(alice);
        vm.expectRevert("Duel creation paused");
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        // The duel that already exists plays out untouched.
        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
        vm.prank(alice);
        duelMe.claimVictory(duelId);
        vm.prank(bob);
        duelMe.confirmResult(duelId);

        uint256 balanceBefore = usdt.balanceOf(alice);
        vm.prank(alice);
        duelMe.claimPayout(duelId);
        assertEq(usdt.balanceOf(alice), balanceBefore + WAGER * 2);
    }

    function testDuelCreationPausedCanBeLifted() public {
        duelMe.setDuelCreationPaused(true);
        duelMe.setDuelCreationPaused(false);

        vm.prank(alice);
        duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        assertEq(duelMe.duelCount(), 1);
    }

    function testDuelCreationPausedOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.setDuelCreationPaused(true);
    }

    function testDuelCreationPausedEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit DuelMe.DuelCreationPausedUpdated(true);
        duelMe.setDuelCreationPaused(true);
    }

    // =====================================================================
    // Ownership handover
    // =====================================================================

    function testOwnershipTransferIsTwoStep() public {
        duelMe.transferOwnership(alice);

        assertEq(duelMe.owner(), address(this), "ownership must not move on the first step");
        assertEq(duelMe.pendingOwner(), alice);

        vm.prank(alice);
        duelMe.acceptOwnership();

        assertEq(duelMe.owner(), alice);
        assertEq(duelMe.pendingOwner(), address(0));
    }

    function testOnlyPendingOwnerCanAccept() public {
        duelMe.transferOwnership(alice);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        duelMe.acceptOwnership();
    }

    function testPendingHandoverCanBeReplaced() public {
        duelMe.transferOwnership(alice);
        duelMe.transferOwnership(bob);

        assertEq(duelMe.pendingOwner(), bob);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.acceptOwnership();
    }
}
