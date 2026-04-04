// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockEmergencyERC20 is ERC20 {
    uint8 private immutable _tokenDecimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _tokenDecimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }
}

/// @dev Helper that self-destructs to force ETH into a contract without receive/fallback
contract SelfDestructSender {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

/// @dev Helper that rejects ETH transfers (for testing failed ETH rescue)
contract ETHRejecter {
    receive() external payable {
        revert("rejected");
    }
}

contract DuelMeEmergencyTest is Test {
    DuelMe public duelMe;
    MockEmergencyERC20 public usdt;
    MockEmergencyERC20 public otherToken;

    address public owner;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public recipient = makeAddr("recipient");

    uint256 public constant WAGER = 10_000_000; // 10 USDT
    bytes32 public constant DEFAULT_INVITE_SECRET = bytes32(uint256(1));
    bytes32 public constant DEFAULT_INVITE_HASH = keccak256(abi.encodePacked(DEFAULT_INVITE_SECRET));

    function setUp() public {
        owner = address(this); // test contract is the deployer/owner

        usdt = new MockEmergencyERC20("Tether USD", "USDT", 6);
        otherToken = new MockEmergencyERC20("Other Token", "OTH", 18);
        duelMe = new DuelMe(address(usdt));

        // Mint USDT to test accounts
        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);

        // Approve DuelMe contract
        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    /// @dev Force ETH into the DuelMe contract via selfdestruct
    function _forceETH(uint256 amount) internal {
        new SelfDestructSender{value: amount}(payable(address(duelMe)));
    }

    /// @dev Create and fund a duel so the contract holds USDT
    function _createAndFundDuel() internal returns (uint256 duelId) {
        vm.prank(alice);
        duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);
        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);
    }

    // =====================================================================
    // rescueToken
    // =====================================================================

    function testRescueToken_happyPath() public {
        // Send other token to the contract accidentally
        uint256 rescueAmount = 500 ether;
        otherToken.mint(address(duelMe), rescueAmount);

        uint256 recipientBefore = otherToken.balanceOf(recipient);
        duelMe.rescueToken(IERC20(address(otherToken)), recipient, rescueAmount);
        uint256 recipientAfter = otherToken.balanceOf(recipient);

        assertEq(recipientAfter - recipientBefore, rescueAmount, "Recipient should receive rescued tokens");
        assertEq(otherToken.balanceOf(address(duelMe)), 0, "Contract should have zero other token");
    }

    function testRescueToken_partialAmount() public {
        uint256 totalAmount = 1000 ether;
        uint256 rescueAmount = 400 ether;
        otherToken.mint(address(duelMe), totalAmount);

        duelMe.rescueToken(IERC20(address(otherToken)), recipient, rescueAmount);

        assertEq(otherToken.balanceOf(recipient), rescueAmount, "Recipient should receive partial rescue");
        assertEq(otherToken.balanceOf(address(duelMe)), totalAmount - rescueAmount, "Contract retains remainder");
    }

    function testRescueToken_revertsForUSDT() public {
        // Even if USDT is "accidentally" in the contract, rescueToken cannot touch it
        usdt.mint(address(duelMe), 100_000_000);

        vm.expectRevert("Cannot rescue USDT");
        duelMe.rescueToken(IERC20(address(usdt)), recipient, 100_000_000);
    }

    function testRescueToken_revertsForUSDTEvenWhenContractHoldsActiveFunds() public {
        _createAndFundDuel(); // contract now holds 20 USDT from the duel

        vm.expectRevert("Cannot rescue USDT");
        duelMe.rescueToken(IERC20(address(usdt)), recipient, 1);
    }

    function testRescueToken_revertsForZeroRecipient() public {
        otherToken.mint(address(duelMe), 100 ether);

        vm.expectRevert("Invalid recipient");
        duelMe.rescueToken(IERC20(address(otherToken)), address(0), 100 ether);
    }

    function testRescueToken_revertsIfNotOwner() public {
        otherToken.mint(address(duelMe), 100 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.rescueToken(IERC20(address(otherToken)), recipient, 100 ether);
    }

    function testRescueToken_revertsIfInsufficientBalance() public {
        // Contract has zero otherToken — safeTransfer should revert
        vm.expectRevert();
        duelMe.rescueToken(IERC20(address(otherToken)), recipient, 1);
    }

    // =====================================================================
    // rescueETH
    // =====================================================================

    function testRescueETH_happyPath() public {
        // Force 1 ETH into the contract
        vm.deal(address(this), 1 ether);
        _forceETH(1 ether);

        assertEq(address(duelMe).balance, 1 ether, "Contract should hold forced ETH");

        uint256 recipientBefore = recipient.balance;
        duelMe.rescueETH(payable(recipient));
        uint256 recipientAfter = recipient.balance;

        assertEq(recipientAfter - recipientBefore, 1 ether, "Recipient should receive rescued ETH");
        assertEq(address(duelMe).balance, 0, "Contract should have zero ETH after rescue");
    }

    function testRescueETH_revertsForZeroRecipient() public {
        vm.deal(address(this), 1 ether);
        _forceETH(1 ether);

        vm.expectRevert("Invalid recipient");
        duelMe.rescueETH(payable(address(0)));
    }

    function testRescueETH_revertsWhenNoETH() public {
        assertEq(address(duelMe).balance, 0, "Contract should have no ETH");

        vm.expectRevert("No ETH to rescue");
        duelMe.rescueETH(payable(recipient));
    }

    function testRescueETH_revertsIfNotOwner() public {
        vm.deal(address(this), 1 ether);
        _forceETH(1 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.rescueETH(payable(recipient));
    }

    function testRescueETH_revertsIfTransferFails() public {
        vm.deal(address(this), 1 ether);
        _forceETH(1 ether);

        ETHRejecter rejecter = new ETHRejecter();

        vm.expectRevert("ETH transfer failed");
        duelMe.rescueETH(payable(address(rejecter)));
    }

    // =====================================================================
    // requestEmergencyWithdraw
    // =====================================================================

    function testRequestEmergencyWithdraw_happyPath() public {
        uint256 amount = 500_000_000;

        vm.expectEmit(true, true, true, true);
        emit DuelMe.EmergencyRequested(0, address(usdt), recipient, amount, block.timestamp + 30 days);

        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, amount);

        assertEq(requestId, 0, "First request should have id 0");
        assertEq(duelMe.emergencyNonce(), 1, "Nonce should increment");

        (address token, address reqRecipient, uint256 reqAmount, uint256 requestedAt) =
            duelMe.emergencyRequests(requestId);
        assertEq(token, address(usdt), "Token mismatch");
        assertEq(reqRecipient, recipient, "Recipient mismatch");
        assertEq(reqAmount, amount, "Amount mismatch");
        assertEq(requestedAt, block.timestamp, "Timestamp mismatch");
    }

    function testRequestEmergencyWithdraw_incrementsNonce() public {
        uint256 id0 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);
        uint256 id1 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 200);
        uint256 id2 = duelMe.requestEmergencyWithdraw(address(otherToken), recipient, 300);

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(duelMe.emergencyNonce(), 3);
    }

    function testRequestEmergencyWithdraw_revertsForZeroToken() public {
        vm.expectRevert("Invalid token");
        duelMe.requestEmergencyWithdraw(address(0), recipient, 100);
    }

    function testRequestEmergencyWithdraw_revertsForZeroRecipient() public {
        vm.expectRevert("Invalid recipient");
        duelMe.requestEmergencyWithdraw(address(usdt), address(0), 100);
    }

    function testRequestEmergencyWithdraw_revertsForZeroAmount() public {
        vm.expectRevert("Invalid amount");
        duelMe.requestEmergencyWithdraw(address(usdt), recipient, 0);
    }

    function testRequestEmergencyWithdraw_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);
    }

    function testRequestEmergencyWithdraw_allowsNonUSDTToken() public {
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(otherToken), recipient, 1 ether);
        (address token,,,) = duelMe.emergencyRequests(requestId);
        assertEq(token, address(otherToken), "Should allow non-USDT emergency requests too");
    }

    // =====================================================================
    // cancelEmergencyWithdraw
    // =====================================================================

    function testCancelEmergencyWithdraw_happyPath() public {
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);

        vm.expectEmit(true, false, false, false);
        emit DuelMe.EmergencyCancelled(requestId);

        duelMe.cancelEmergencyWithdraw(requestId);

        // Verify the request is deleted
        (address token,, uint256 amount, uint256 requestedAt) = duelMe.emergencyRequests(requestId);
        assertEq(token, address(0), "Token should be zero after cancel");
        assertEq(amount, 0, "Amount should be zero after cancel");
        assertEq(requestedAt, 0, "requestedAt should be zero after cancel");
    }

    function testCancelEmergencyWithdraw_revertsForNonExistentRequest() public {
        vm.expectRevert("Request not found");
        duelMe.cancelEmergencyWithdraw(999);
    }

    function testCancelEmergencyWithdraw_revertsIfAlreadyCancelled() public {
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);
        duelMe.cancelEmergencyWithdraw(requestId);

        // Try to cancel again
        vm.expectRevert("Request not found");
        duelMe.cancelEmergencyWithdraw(requestId);
    }

    function testCancelEmergencyWithdraw_revertsIfNotOwner() public {
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.cancelEmergencyWithdraw(requestId);
    }

    function testCancelEmergencyWithdraw_canCancelEvenAfterTimelockExpires() public {
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);

        // Warp past the 30-day timelock
        vm.warp(block.timestamp + 30 days + 1);

        // Should still be cancellable
        duelMe.cancelEmergencyWithdraw(requestId);

        (,,, uint256 requestedAt) = duelMe.emergencyRequests(requestId);
        assertEq(requestedAt, 0, "Should be deleted even after timelock");
    }

    function testCancelEmergencyWithdraw_doesNotAffectOtherRequests() public {
        uint256 id0 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);
        uint256 id1 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 200);

        duelMe.cancelEmergencyWithdraw(id0);

        // id1 should still exist
        (address token,, uint256 amount, uint256 requestedAt) = duelMe.emergencyRequests(id1);
        assertEq(token, address(usdt), "Other request token intact");
        assertEq(amount, 200, "Other request amount intact");
        assertTrue(requestedAt > 0, "Other request still pending");
    }

    // =====================================================================
    // executeEmergencyWithdraw
    // =====================================================================

    function testExecuteEmergencyWithdraw_happyPathUSDT() public {
        // Seed the contract with USDT (e.g. from active duels)
        uint256 amount = 20_000_000; // 20 USDT
        usdt.mint(address(duelMe), amount);

        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, amount);

        // Warp exactly to the timelock boundary
        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, true, true, true);
        emit DuelMe.EmergencyExecuted(requestId, address(usdt), recipient, amount);

        duelMe.executeEmergencyWithdraw(requestId);

        assertEq(usdt.balanceOf(recipient), amount, "Recipient should receive USDT");
        assertEq(usdt.balanceOf(address(duelMe)), 0, "Contract USDT should be drained");

        // Verify the request is deleted after execution
        (,,, uint256 requestedAt) = duelMe.emergencyRequests(requestId);
        assertEq(requestedAt, 0, "Request should be deleted after execution");
    }

    function testExecuteEmergencyWithdraw_happyPathOtherToken() public {
        uint256 amount = 1000 ether;
        otherToken.mint(address(duelMe), amount);

        uint256 requestId = duelMe.requestEmergencyWithdraw(address(otherToken), recipient, amount);

        vm.warp(block.timestamp + 30 days);

        duelMe.executeEmergencyWithdraw(requestId);

        assertEq(otherToken.balanceOf(recipient), amount, "Recipient should receive other token");
    }

    function testExecuteEmergencyWithdraw_revertsBeforeTimelock() public {
        usdt.mint(address(duelMe), 100_000_000);
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);

        // Warp to 1 second before timelock expires
        vm.warp(block.timestamp + 30 days - 1);

        vm.expectRevert("Timelock not expired");
        duelMe.executeEmergencyWithdraw(requestId);
    }

    function testExecuteEmergencyWithdraw_revertsAtZeroElapsed() public {
        usdt.mint(address(duelMe), 100_000_000);
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);

        // No time warp — execute immediately
        vm.expectRevert("Timelock not expired");
        duelMe.executeEmergencyWithdraw(requestId);
    }

    function testExecuteEmergencyWithdraw_revertsForNonExistentRequest() public {
        vm.expectRevert("Request not found");
        duelMe.executeEmergencyWithdraw(999);
    }

    function testExecuteEmergencyWithdraw_revertsIfAlreadyExecuted() public {
        usdt.mint(address(duelMe), 100_000_000);
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);

        vm.warp(block.timestamp + 30 days);
        duelMe.executeEmergencyWithdraw(requestId);

        // Try to execute again
        vm.expectRevert("Request not found");
        duelMe.executeEmergencyWithdraw(requestId);
    }

    function testExecuteEmergencyWithdraw_revertsIfAlreadyCancelled() public {
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);
        duelMe.cancelEmergencyWithdraw(requestId);

        vm.warp(block.timestamp + 30 days);

        vm.expectRevert("Request not found");
        duelMe.executeEmergencyWithdraw(requestId);
    }

    function testExecuteEmergencyWithdraw_revertsIfNotOwner() public {
        usdt.mint(address(duelMe), 100_000_000);
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);

        vm.warp(block.timestamp + 30 days);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        duelMe.executeEmergencyWithdraw(requestId);
    }

    function testExecuteEmergencyWithdraw_revertsIfInsufficientTokenBalance() public {
        // Request more than the contract holds
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 999_000_000);

        vm.warp(block.timestamp + 30 days);

        // safeTransfer will revert due to insufficient balance
        vm.expectRevert();
        duelMe.executeEmergencyWithdraw(requestId);
    }

    function testExecuteEmergencyWithdraw_exactTimelockBoundary() public {
        usdt.mint(address(duelMe), 100_000_000);
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);

        uint256 requestedAt = block.timestamp;

        // At exactly requestedAt + EMERGENCY_DELAY, it should succeed
        vm.warp(requestedAt + 30 days);
        duelMe.executeEmergencyWithdraw(requestId);

        assertEq(usdt.balanceOf(recipient), 100_000_000);
    }

    function testExecuteEmergencyWithdraw_wellPastTimelock() public {
        usdt.mint(address(duelMe), 100_000_000);
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);

        // 90 days later — should still work
        vm.warp(block.timestamp + 90 days);
        duelMe.executeEmergencyWithdraw(requestId);

        assertEq(usdt.balanceOf(recipient), 100_000_000);
    }

    // =====================================================================
    // Multi-request scenarios
    // =====================================================================

    function testMultipleEmergencyRequests_executeIndependently() public {
        usdt.mint(address(duelMe), 200_000_000);
        otherToken.mint(address(duelMe), 50 ether);

        address recipient2 = makeAddr("recipient2");

        uint256 id0 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100_000_000);
        uint256 id1 = duelMe.requestEmergencyWithdraw(address(usdt), recipient2, 100_000_000);
        uint256 id2 = duelMe.requestEmergencyWithdraw(address(otherToken), recipient, 50 ether);

        vm.warp(block.timestamp + 30 days);

        // Execute in non-sequential order
        duelMe.executeEmergencyWithdraw(id2);
        duelMe.executeEmergencyWithdraw(id0);
        duelMe.executeEmergencyWithdraw(id1);

        assertEq(usdt.balanceOf(recipient), 100_000_000, "recipient USDT");
        assertEq(usdt.balanceOf(recipient2), 100_000_000, "recipient2 USDT");
        assertEq(otherToken.balanceOf(recipient), 50 ether, "recipient other token");
    }

    function testCancelOneExecuteAnother() public {
        usdt.mint(address(duelMe), 100_000_000);

        uint256 id0 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 50_000_000);
        uint256 id1 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 50_000_000);

        duelMe.cancelEmergencyWithdraw(id0);

        vm.warp(block.timestamp + 30 days);

        duelMe.executeEmergencyWithdraw(id1);

        assertEq(usdt.balanceOf(recipient), 50_000_000, "Only the non-cancelled request should execute");
        assertEq(usdt.balanceOf(address(duelMe)), 50_000_000, "Remaining balance stays");
    }

    // =====================================================================
    // Full lifecycle: request → wait → execute with active duels
    // =====================================================================

    function testEmergencyWithdrawDoesNotInterfereWithDuels() public {
        // Create and fund a duel so contract holds 20 USDT
        _createAndFundDuel();
        uint256 contractBalance = usdt.balanceOf(address(duelMe));
        assertEq(contractBalance, 2 * WAGER, "Contract should hold both wagers");

        // Owner requests emergency withdrawal of the full balance
        uint256 requestId = duelMe.requestEmergencyWithdraw(address(usdt), recipient, contractBalance);

        vm.warp(block.timestamp + 30 days);

        // This will drain the contract of USDT — even funds backing active duels
        // This is the intended "emergency" behavior
        duelMe.executeEmergencyWithdraw(requestId);

        assertEq(usdt.balanceOf(address(duelMe)), 0, "Contract drained");
        assertEq(usdt.balanceOf(recipient), contractBalance, "Recipient received funds");
    }

    // =====================================================================
    // Nonce does not reuse IDs after cancel/execute
    // =====================================================================

    function testNonceNeverReusesIds() public {
        uint256 id0 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 100);
        duelMe.cancelEmergencyWithdraw(id0);

        uint256 id1 = duelMe.requestEmergencyWithdraw(address(usdt), recipient, 200);
        assertEq(id1, 1, "New request should get next nonce, not reuse cancelled ID");

        assertEq(duelMe.emergencyNonce(), 2);
    }
}
