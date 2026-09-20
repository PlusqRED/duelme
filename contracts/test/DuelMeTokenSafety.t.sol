// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./helpers/DuelMeFixture.sol";
import "../script/TokenFeeProbe.sol";

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

/// @dev `requireNoTransferFee` is a library `internal` call, so it is inlined into its caller and
///      a revert lands at the same depth as the cheatcode. `vm.expectRevert` needs the revert one
///      frame deeper, so the suite calls the probe through here — which also makes the harness the
///      token holder, matching how a deploy script runs it (caller and holder are the same).
contract TokenFeeProbeHarness {
    function probe(IERC20 token, address holder, uint256 amount) external {
        TokenFeeProbe.requireNoTransferFee(token, holder, amount);
    }
}

/// @notice A duel's payout is exactly twice the wager the contract recorded. If the token ever
///         delivers less than it was asked to, that arithmetic quietly stops being backed by the
///         balance, and the players who claim last are the ones who find out.
///
///         The contract no longer checks this per wager: the token is `immutable`, so the question
///         is asked once at deploy by `TokenFeeProbe`. These tests cover the probe, and pin what
///         the contract does without it — so the cost of that trade is written down and visible.
contract DuelMeTokenSafetyTest is DuelMeFixture {
    /// @dev The same contract as `usdt`, typed so the fee can be switched on mid-test.
    FeeOnTransferERC20 public feeUsdt;

    uint256 internal constant PROBE = 1_000_000; // 1 USDT

    TokenFeeProbeHarness internal probeHarness;

    function _deployToken() internal override returns (PlainUsdt) {
        feeUsdt = new FeeOnTransferERC20();
        return feeUsdt;
    }

    function setUp() public {
        _deployFixture();
        probeHarness = new TokenFeeProbeHarness();
        // The probe transfers as its caller, so the caller is the one that has to hold the balance.
        usdt.mint(address(probeHarness), STARTING_BALANCE);
    }

    function _probe(uint256 amount) internal {
        probeHarness.probe(usdt, address(probeHarness), amount);
    }

    // ── The deploy-time probe ────────────────────────────────────────────

    function testProbeRejectsATokenThatTakesAFee() public {
        feeUsdt.setFeeBps(50);

        vm.expectRevert("TokenFeeProbe: token takes a transfer fee");
        _probe(PROBE);
    }

    /// @dev The smallest fee a basis-point rate can express must still be caught: at 1 bps the
    ///      probe loses 100 of 1_000_000 units, which is exactly the case a smaller probe amount
    ///      would round away to zero and wave through.
    function testProbeRejectsTheSmallestExpressibleFee() public {
        feeUsdt.setFeeBps(1);

        vm.expectRevert("TokenFeeProbe: token takes a transfer fee");
        _probe(PROBE);
    }

    function testProbeAcceptsATokenThatDeliversInFull() public {
        uint256 balanceBefore = usdt.balanceOf(address(probeHarness));

        _probe(PROBE);

        assertEq(usdt.balanceOf(address(probeHarness)), balanceBefore, "probe must not cost the holder");
    }

    function testProbeRefusesToPassWithoutABalanceToProbeWith() public {
        vm.expectRevert("TokenFeeProbe: holder needs a probe balance");
        probeHarness.probe(usdt, makeAddr("broke"), PROBE);
    }

    function testProbeRefusesAZeroAmount() public {
        vm.expectRevert("TokenFeeProbe: probe amount is zero");
        _probe(0);
    }

    // ── What the contract does once the probe has passed ─────────────────

    function testNormalTokenIsUnaffected() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
    }

    /// @dev The price of moving the check to deploy time, pinned rather than left implicit: a fee
    ///      switched on after deploy is NOT refused. The duel records two full wagers and the
    ///      escrow holds less, so the second claimant is short. `pause()` is the response — it
    ///      stops duels being entered while leaving every payout and refund open.
    function testFeeSwitchedOnAfterDeployUnderCollateralisesTheDuel() public {
        feeUsdt.setFeeBps(50);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, bytes32(0));
        vm.prank(bob);
        duelMe.joinDuel(duelId, bytes32(0));

        DuelMe.DuelView memory d = duelMe.getDuel(duelId);
        uint256 owed = uint256(d.wagerAmount) * 2;
        uint256 held = usdt.balanceOf(address(duelMe));

        assertEq(owed, WAGER * 2, "the duel still records two full wagers");
        assertLt(held, owed, "the escrow is short: this is what pause() is for");
    }
}
