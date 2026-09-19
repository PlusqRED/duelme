// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "./helpers/PlainUsdt.sol";

/// @dev Mainnet USDT's own implementation carries a transfer-fee switch. This mirrors it being
///      switched on: every transfer delivers less than it was asked to move.
contract FeeOnTransferERC20 is PlainUsdt {
    uint256 public feeBps;

    function setFeeBps(uint256 bps) external {
        feeBps = bps;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || feeBps == 0) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * feeBps) / 10_000;
        super._update(from, to, value - fee);
        super._update(from, address(0xFEE), fee);
    }
}

/// @notice A duel's payout is exactly twice the wager the contract recorded. If the token ever
///         delivers less than it was asked to, that arithmetic quietly stops being backed by
///         the balance, and the players who claim last are the ones who find out.
contract DuelMeTokenSafetyTest is Test {
    DuelMe public duelMe;
    FeeOnTransferERC20 public usdt;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant WAGER = 10_000_000;
    uint96 public constant MIN_WAGER = 300_000;

    function setUp() public {
        usdt = new FeeOnTransferERC20();
        duelMe = new DuelMe(address(usdt), MIN_WAGER, address(new ERC2771Forwarder("DuelMe Forwarder")));

        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);
        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);
    }

    function testCreateDuelRefusesATokenThatTakesAFee() public {
        usdt.setFeeBps(50);

        vm.prank(alice);
        vm.expectRevert("Token fee on transfer");
        duelMe.createDuel(WAGER, bytes32(0));
    }

    function testJoinDuelRefusesATokenThatTakesAFee() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));

        // The switch flips between the two halves of the same duel.
        usdt.setFeeBps(50);

        vm.prank(bob);
        vm.expectRevert("Token fee on transfer");
        duelMe.joinDuel(duelId, bytes32(0));
    }

    function testNormalTokenIsUnaffected() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
    }
}
