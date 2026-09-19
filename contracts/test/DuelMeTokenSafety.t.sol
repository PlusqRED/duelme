// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./helpers/DuelMeFixture.sol";

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
contract DuelMeTokenSafetyTest is DuelMeFixture {
    /// @dev The same contract as `usdt`, typed so the fee can be switched on mid-test.
    FeeOnTransferERC20 public feeUsdt;

    function _deployToken() internal override returns (PlainUsdt) {
        feeUsdt = new FeeOnTransferERC20();
        return feeUsdt;
    }

    function setUp() public {
        _deployFixture();
    }

    function testCreateDuelRefusesATokenThatTakesAFee() public {
        feeUsdt.setFeeBps(50);

        vm.prank(alice);
        vm.expectRevert("Token fee on transfer");
        duelMe.createDuel(WAGER, bytes32(0));
    }

    function testJoinDuelRefusesATokenThatTakesAFee() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));

        // The switch flips between the two halves of the same duel.
        feeUsdt.setFeeBps(50);

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
