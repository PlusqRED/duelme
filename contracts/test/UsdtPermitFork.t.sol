// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "./helpers/MetaTxSigner.sol";
import "../src/DuelMe.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC5267.sol";

/// @dev Stands in for an EIP-7702 delegate that does not honour the permit digest. Only its
///      presence as code at the owner address matters to the token's signature check.
contract RefusingSigner {
    function isValidSignature(bytes32, bytes memory) external pure returns (bytes4) {
        return 0xffffffff;
    }
}

/// @dev Runs the gasless funding path against the REAL Arbitrum One USDT (USD₮0), which is
///      the one thing Arbitrum Sepolia cannot reproduce: testnet runs our own MockUSDT, whose
///      EIP-712 domain differs from mainnet's in the two ways that silently break signatures
///      — an ASCII name vs "USD₮0" (U+20AE), and a working eip712Domain() vs one that
///      reverts. Skipped unless ARBITRUM_RPC_URL is set.
contract UsdtPermitForkTest is MetaTxSigner {
    address internal constant ARBITRUM_USDT = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    uint256 internal constant ARBITRUM_ONE_CHAIN_ID = 42161;

    DuelMe internal duelMe;
    ERC2771Forwarder internal forwarder;
    IERC20 internal usdt;

    address internal alice;
    uint256 internal aliceKey;
    address internal bob;
    uint256 internal bobKey;
    address internal relayer = makeAddr("relayer");

    function setUp() public {
        string memory rpcUrl = vm.envOr("ARBITRUM_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            return;
        }

        vm.createSelectFork(rpcUrl);
        require(block.chainid == ARBITRUM_ONE_CHAIN_ID, "fork is not Arbitrum One");

        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob, bobKey) = makeAddrAndKey("bob");

        usdt = IERC20(ARBITRUM_USDT);
        forwarder = new ERC2771Forwarder(FORWARDER_NAME);
        duelMe = new DuelMe(ARBITRUM_USDT, MIN_WAGER, address(forwarder));
        DEFAULT_INVITE_HASH = duelMe.hashInviteSecret(DEFAULT_INVITE_SECRET);

        // Forge's canonical test addresses are real addresses with real mainnet state, and
        // makeAddr("alice") happens to carry a live EIP-7702 delegation on Arbitrum One.
        // USD₮0 routes permit through ERC-1271 for anything with code (see the delegation
        // test below), so clear it or every signature here validates down the wrong branch.
        vm.etch(alice, "");
        vm.etch(bob, "");

        deal(ARBITRUM_USDT, alice, 1_000_000_000);
        deal(ARBITRUM_USDT, bob, 1_000_000_000);
        vm.deal(alice, 0);
        vm.deal(bob, 0);
    }

    modifier onlyForked() {
        vm.skip(address(duelMe) == address(0));
        _;
    }

    /// @dev The mainnet token's domain is the exact thing a frontend gets wrong. Rebuild it
    ///      from name() + "1" — the only route available, since eip712Domain() is missing —
    ///      and assert it equals what the token itself reports.
    function testMainnetUsdtDomainIsNamePlusVersionOne() public onlyForked {
        (bool hasErc5267,) = ARBITRUM_USDT.staticcall(abi.encodeCall(IERC5267.eip712Domain, ()));
        assertFalse(hasErc5267, "mainnet USDT still has no ERC-5267: revisit the frontend domain builder");

        (, bytes memory nameData) = ARBITRUM_USDT.staticcall(abi.encodeWithSignature("name()"));
        assertEq(abi.decode(nameData, (string)), unicode"USD₮0", "token name is not ASCII - it carries U+20AE");

        // Asserts the name() + "1" reconstruction equals the token's own DOMAIN_SEPARATOR().
        _tokenDomainSeparator(ARBITRUM_USDT);
    }

    function testRelayedCreateAndJoinWithPermitOnMainnetUsdt() public onlyForked {
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createWithPermitData(aliceKey, WAGER));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), _joinWithPermitData(bobKey, 0, WAGER));

        DuelMe.DuelView memory duel = duelMe.getDuel(0);
        assertEq(duel.creator, alice);
        assertEq(duel.opponent, bob);
        assertEq(uint8(duel.state), uint8(DuelMe.DuelState.Funded));
        assertEq(usdt.balanceOf(address(duelMe)), WAGER * 2);
        assertEq(alice.balance, 0, "players paid no gas");
        assertEq(bob.balance, 0);
    }

    function testMainnetUsdtPayoutReachesTheWinner() public onlyForked {
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), _createWithPermitData(aliceKey, WAGER));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), _joinWithPermitData(bobKey, 0, WAGER));
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimVictory, (0)));
        _relayAs(forwarder, relayer, bobKey, address(duelMe), abi.encodeCall(DuelMe.confirmResult, (0)));

        uint256 balanceBefore = usdt.balanceOf(alice);
        _relayAs(forwarder, relayer, aliceKey, address(duelMe), abi.encodeCall(DuelMe.claimPayout, (uint256(0))));

        assertEq(usdt.balanceOf(alice), balanceBefore + WAGER * 2);
    }

    function testFrontRunPermitOnMainnetUsdtStillCreatesTheDuel() public onlyForked {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ARBITRUM_USDT, aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(makeAddr("attacker"));
        IERC20Permit(ARBITRUM_USDT).permit(alice, address(duelMe), WAGER, deadline, v, r, s);

        vm.prank(alice);
        uint256 duelId = duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);

        assertEq(duelMe.getDuel(duelId).creator, alice);
    }

    /// @dev USD₮0 does not call ecrecover when the permit owner has code — it delegates to
    ///      ERC-1271. An EIP-7702 delegation gives a plain EOA code, so a player who has
    ///      delegated their account elsewhere has their permit validated by whatever contract
    ///      they delegated to. A delegate that refuses (or does not implement) isValidSignature
    ///      makes the permit path unusable for them, and _permit surfaces that as "Permit
    ///      failed" rather than an opaque transferFrom revert. The plain createDuel entry
    ///      point still works once an allowance exists, so such a player is not locked out —
    ///      they just cannot skip the approve.
    function testDelegatedEoaCannotUsePermitButCanStillApprove() public onlyForked {
        vm.etch(alice, address(new RefusingSigner()).code);

        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ARBITRUM_USDT, aliceKey, address(duelMe), WAGER, deadline);

        vm.prank(alice);
        vm.expectRevert("Permit failed");
        duelMe.createDuelWithPermit(WAGER, DEFAULT_INVITE_HASH, "", deadline, v, r, s);

        vm.prank(alice);
        usdt.approve(address(duelMe), WAGER);
        vm.prank(alice);
        uint256 duelId = duelMe.createDuel(WAGER, DEFAULT_INVITE_HASH);

        assertEq(duelMe.getDuel(duelId).creator, alice);
    }

    // ─── helpers ───

    function _createWithPermitData(uint256 signerKey, uint256 amount) internal view returns (bytes memory) {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ARBITRUM_USDT, signerKey, address(duelMe), amount, deadline);
        return abi.encodeCall(DuelMe.createDuelWithPermit, (amount, DEFAULT_INVITE_HASH, "", deadline, v, r, s));
    }

    function _joinWithPermitData(uint256 signerKey, uint256 duelId, uint256 amount)
        internal
        view
        returns (bytes memory)
    {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(ARBITRUM_USDT, signerKey, address(duelMe), amount, deadline);
        return abi.encodeCall(DuelMe.joinDuelWithPermit, (duelId, DEFAULT_INVITE_SECRET, deadline, v, r, s));
    }

}
