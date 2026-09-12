// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Simple ERC20 mock with public mint for testing
contract MockConfigERC20 is ERC20 {
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

contract DuelMeAdminConfigTest is Test {
    DuelMe public duelMe;
    MockConfigERC20 public usdt;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint96 public constant MIN_WAGER = 300_000; // 0.3 USDT
    bytes32 public constant DEFAULT_INVITE_SECRET = bytes32(uint256(1));
    bytes32 public constant DEFAULT_INVITE_HASH = keccak256(abi.encodePacked(DEFAULT_INVITE_SECRET));

    function setUp() public {
        usdt = new MockConfigERC20("Tether USD", "USDT", 6);
        duelMe = new DuelMe(address(usdt), MIN_WAGER);

        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);

        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);
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
}
