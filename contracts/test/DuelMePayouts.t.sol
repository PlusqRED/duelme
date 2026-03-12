// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPayoutERC20 is ERC20 {
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

contract DuelMePayoutsTest is Test {
    DuelMe public duelMe;
    MockPayoutERC20 public usdt;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant WAGER = 10_000_000;
    bytes32 public constant DEFAULT_INVITE_SECRET = bytes32(uint256(1));
    bytes32 public constant DEFAULT_INVITE_HASH = keccak256(abi.encodePacked(DEFAULT_INVITE_SECRET));

    function setUp() public {
        usdt = new MockPayoutERC20("Tether USD", "USDT", 6);
        duelMe = new DuelMe(address(usdt));

        usdt.mint(alice, 1_000_000_000);
        usdt.mint(bob, 1_000_000_000);

        vm.prank(alice);
        usdt.approve(address(duelMe), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(duelMe), type(uint256).max);
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

    function testClaimPayoutTransfersWinnerFunds() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        duelMe.confirmResult(duelId);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit DuelMe.DuelPayoutClaimed(duelId, alice, WAGER * 2);
        duelMe.claimPayout(duelId);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2);
        _assertPayouts(duelId, WAGER * 2, 0, true, false);
    }

    function testClaimPayoutRevertsWhenNothingToClaim() public {
        uint256 duelId = _createAndFundDuel();

        vm.prank(alice);
        vm.expectRevert("Nothing to claim");
        duelMe.claimPayout(duelId);
    }

    function testClaimPayoutRevertsAfterAlreadyClaimed() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        duelMe.confirmResult(duelId);

        vm.prank(alice);
        duelMe.claimPayout(duelId);

        vm.prank(alice);
        vm.expectRevert("Nothing to claim");
        duelMe.claimPayout(duelId);
    }

    function testClaimPayoutsBatchClaimsMultipleDuels() public {
        vm.prank(alice);
        uint256 cancelledDuel = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        vm.prank(alice);
        duelMe.cancelDuel(cancelledDuel);

        uint256 resolvedDuel = _createFundAndClaim();
        vm.prank(bob);
        duelMe.confirmResult(resolvedDuel);

        uint256[] memory duelIds = new uint256[](2);
        duelIds[0] = cancelledDuel;
        duelIds[1] = resolvedDuel;

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        duelMe.claimPayouts(duelIds);

        assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 3);
        _assertPayouts(cancelledDuel, WAGER, 0, true, false);
        _assertPayouts(resolvedDuel, WAGER * 2, 0, true, false);
    }

    function testClaimPayoutWhenPausedReverts() public {
        uint256 duelId = _createFundAndClaim();

        vm.prank(bob);
        duelMe.confirmResult(duelId);

        duelMe.pause();

        vm.prank(alice);
        vm.expectRevert();
        duelMe.claimPayout(duelId);
    }

    function testLifecycleTimestampsTrackDuelProgress() public {
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        DuelMe.Duel memory created = duelMe.getDuel(duelId);
        assertEq(created.createdAt, block.timestamp);
        assertEq(created.fundedAt, 0);
        assertEq(created.claimTimestamp, 0);
        assertEq(created.finalizedAt, 0);

        vm.warp(block.timestamp + 10);
        vm.prank(bob);
        duelMe.joinDuel(duelId, DEFAULT_INVITE_SECRET);

        DuelMe.Duel memory funded = duelMe.getDuel(duelId);
        assertEq(funded.createdAt, created.createdAt);
        assertEq(funded.fundedAt, block.timestamp);
        assertEq(funded.claimTimestamp, 0);
        assertEq(funded.finalizedAt, 0);

        vm.warp(block.timestamp + 20);
        vm.prank(alice);
        duelMe.claimVictory(duelId);

        DuelMe.Duel memory claimed = duelMe.getDuel(duelId);
        assertEq(claimed.claimTimestamp, block.timestamp);
        assertEq(claimed.finalizedAt, 0);

        vm.warp(block.timestamp + 30);
        vm.prank(bob);
        duelMe.confirmResult(duelId);

        DuelMe.Duel memory resolved = duelMe.getDuel(duelId);
        assertEq(resolved.createdAt, created.createdAt);
        assertEq(resolved.fundedAt, funded.fundedAt);
        assertEq(resolved.claimTimestamp, claimed.claimTimestamp);
        assertEq(resolved.finalizedAt, block.timestamp);
    }
}
