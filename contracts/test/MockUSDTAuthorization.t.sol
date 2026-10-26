// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./helpers/MetaTxSigner.sol";
import "../src/MockUSDT.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/// @dev MockUSDT's EIP-3009 `transferWithAuthorization`, which the relayer sends the wallet menu's
///      transfer through on the test network. Mainnet USD₮0's own is covered by
///      UsdtPermitFork.t.sol; this suite pins that the mock takes the same signature and refuses
///      with the same strings, so dev catches what mainnet would.
contract MockUSDTAuthorizationTest is MetaTxSigner {
    MockUSDT internal usdt;

    address internal alice;
    uint256 internal aliceKey;
    address internal bob;
    uint256 internal bobKey;
    address internal relayer = makeAddr("relayer");
    address internal friend = makeAddr("friend");

    uint256 internal constant BALANCE = 100_000_000;
    uint256 internal constant AMOUNT = 25_000_000;
    bytes32 internal constant NONCE = DuelMeTestConstants.RELAYED_TRANSFER_NONCE;

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

        usdt = new MockUSDT();
        usdt.mint(alice, BALANCE);
        usdt.mint(bob, BALANCE);
        vm.warp(1_750_000_000);
    }

    function testTransferWithAuthorizationMovesTheSignedAmount() public {
        _submit(aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        assertEq(usdt.balanceOf(alice), BALANCE - AMOUNT);
        assertEq(usdt.balanceOf(friend), AMOUNT);
        assertEq(usdt.balanceOf(relayer), 0, "the sender moves nothing of its own");
        assertTrue(usdt.authorizationState(alice, NONCE));
    }

    function testTransferWithAuthorizationEmitsTheUsedNonceAndTheTransfer() public {
        vm.expectEmit(true, true, false, false, address(usdt));
        emit AuthorizationUsed(alice, NONCE);
        vm.expectEmit(true, true, false, true, address(usdt));
        emit Transfer(alice, friend, AMOUNT);

        _submit(aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);
    }

    function testAuthorizationStateStartsUnused() public view {
        assertFalse(usdt.authorizationState(alice, NONCE));
    }

    function testTransferWithAuthorizationRefusesTheSameAuthorizationTwice() public {
        uint256 validBefore = _validBefore();
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, AMOUNT, 0, validBefore, NONCE);
        vm.prank(relayer);
        usdt.transferWithAuthorization(alice, friend, AMOUNT, 0, validBefore, NONCE, v, r, s);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: auth invalid");
        usdt.transferWithAuthorization(alice, friend, AMOUNT, 0, validBefore, NONCE, v, r, s);
    }

    /// @dev What holds the relayed transfer to one a day: every authorization of a day signs that
    ///      day's nonce, so a second one, to anyone and of any amount, is refused by the token.
    function testTransferWithAuthorizationRefusesAnotherTransferUnderAUsedNonce() public {
        _submit(aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, bob, 1, 0, _validBefore(), NONCE);
        vm.prank(relayer);
        vm.expectRevert("TetherToken: auth invalid");
        usdt.transferWithAuthorization(alice, bob, 1, 0, _validBefore(), NONCE, v, r, s);
    }

    function testTransferWithAuthorizationKeepsNoncesPerAuthorizer() public {
        _submit(aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        _submit(bobKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        assertEq(usdt.balanceOf(friend), AMOUNT * 2);
        assertTrue(usdt.authorizationState(bob, NONCE));
    }

    function testTransferWithAuthorizationRefusesBeforeValidAfter() public {
        uint256 validAfter = block.timestamp;
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, AMOUNT, validAfter, _validBefore(), NONCE);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: auth early");
        usdt.transferWithAuthorization(alice, friend, AMOUNT, validAfter, _validBefore(), NONCE, v, r, s);
    }

    function testTransferWithAuthorizationRefusesAtValidBefore() public {
        uint256 validBefore = block.timestamp;
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, AMOUNT, 0, validBefore, NONCE);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: auth expired");
        usdt.transferWithAuthorization(alice, friend, AMOUNT, 0, validBefore, NONCE, v, r, s);
    }

    function testTransferWithAuthorizationRefusesAnotherSigner() public {
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), bobKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: invalid signature");
        usdt.transferWithAuthorization(alice, friend, AMOUNT, 0, _validBefore(), NONCE, v, r, s);
    }

    function testTransferWithAuthorizationRefusesAnotherRecipient() public {
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: invalid signature");
        usdt.transferWithAuthorization(alice, relayer, AMOUNT, 0, _validBefore(), NONCE, v, r, s);
    }

    function testTransferWithAuthorizationRefusesAnotherAmount() public {
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: invalid signature");
        usdt.transferWithAuthorization(alice, friend, AMOUNT + 1, 0, _validBefore(), NONCE, v, r, s);
    }

    function testTransferWithAuthorizationRefusesAMalformedSignature() public {
        (, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, AMOUNT, 0, _validBefore(), NONCE);

        vm.prank(relayer);
        vm.expectRevert("TetherToken: invalid signature");
        usdt.transferWithAuthorization(alice, friend, AMOUNT, 0, _validBefore(), NONCE, 0, r, s);
    }

    function testTransferWithAuthorizationRefusesMoreThanTheBalanceAndKeepsTheNonce() public {
        (uint8 v, bytes32 r, bytes32 s) =
            _signTransferAuthorization(address(usdt), aliceKey, friend, BALANCE + 1, 0, _validBefore(), NONCE);

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, BALANCE, BALANCE + 1)
        );
        usdt.transferWithAuthorization(alice, friend, BALANCE + 1, 0, _validBefore(), NONCE, v, r, s);

        assertFalse(usdt.authorizationState(alice, NONCE), "a refused transfer leaves the nonce unused");
    }

    function testTransferWithAuthorizationTypehashIsEip3009s() public view {
        assertEq(usdt.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), TRANSFER_WITH_AUTHORIZATION_TYPEHASH);
    }

    function testFuzzTransferWithAuthorizationMovesExactlyTheValue(uint256 value, bytes32 nonce) public {
        value = bound(value, 0, BALANCE);

        _submit(aliceKey, friend, value, 0, _validBefore(), nonce);

        assertEq(usdt.balanceOf(alice), BALANCE - value);
        assertEq(usdt.balanceOf(friend), value);
        assertTrue(usdt.authorizationState(alice, nonce));
    }

    // ─── helpers ───

    function _validBefore() internal view returns (uint256) {
        return block.timestamp + DuelMeTestConstants.RELAYED_TRANSFER_VALIDITY;
    }

    function _submit(
        uint256 signerKey,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal {
        _relayTransferAuthorization(address(usdt), relayer, signerKey, to, value, validAfter, validBefore, nonce);
    }
}
