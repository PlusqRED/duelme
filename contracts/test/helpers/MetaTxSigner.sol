// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/interfaces/IERC5267.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../../script/ForwarderConfig.sol";
import "./DuelMeTestConstants.sol";

/// @dev EIP-712 signing helpers shared by the ERC-2771 and EIP-2612 suites. Domains are
///      always read back from the deployed contract rather than rebuilt from constants, so a
///      domain drift shows up as a failing signature instead of a test that quietly signs the
///      wrong thing. Forwarders go through ERC-5267; tokens cannot, because mainnet USDT does
///      not implement it — see _tokenDomainSeparator.
abstract contract MetaTxSigner is Test {
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 internal constant FORWARD_REQUEST_TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"
    );

    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    /// @dev Gas the relayer promises the forwarded call. Generous on purpose: every test
    ///      except the gas-accounting ones runs `execute` with an effectively unlimited
    ///      outer budget, so _checkForwardedGas is satisfied either way.
    uint256 internal constant DEFAULT_REQUEST_GAS = 1_000_000;

    function _erc5267DomainSeparator(address verifier) internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) =
            IERC5267(verifier).eip712Domain();

        return _buildDomainSeparator(name, version, chainId, verifyingContract);
    }

    /// @dev The token's own DOMAIN_SEPARATOR() is authoritative, but a client cannot read the
    ///      pieces out of it — mainnet USDT has no ERC-5267 — so it has to rebuild the domain
    ///      from name() + version "1". Asserting the two agree here means every permit test in
    ///      the suite also proves that reconstruction rule, which is the one the frontend and
    ///      the relayer have to follow.
    function _tokenDomainSeparator(address token) internal view returns (bytes32) {
        bytes32 onChain = abi.decode(_staticcall(token, abi.encodeWithSignature("DOMAIN_SEPARATOR()")), (bytes32));
        string memory name = abi.decode(_staticcall(token, abi.encodeWithSignature("name()")), (string));

        assertEq(
            _buildDomainSeparator(name, "1", block.chainid, token),
            onChain,
            "token domain is not name() + version 1"
        );

        return onChain;
    }

    function _buildDomainSeparator(
        string memory name,
        string memory version,
        uint256 chainId,
        address verifyingContract
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }

    function _staticcall(address target, bytes memory data) private view returns (bytes memory) {
        (bool ok, bytes memory result) = target.staticcall(data);
        require(ok, "static call failed");
        return result;
    }

    function _forwardRequest(
        ERC2771Forwarder forwarder,
        uint256 signerKey,
        address to,
        bytes memory data
    ) internal view returns (ERC2771Forwarder.ForwardRequestData memory) {
        return _forwardRequest(
            forwarder, signerKey, to, data, DEFAULT_REQUEST_GAS, uint48(block.timestamp + 1 hours)
        );
    }

    /// @dev ForwardRequestData has no `nonce` member in OpenZeppelin 5.x — the forwarder
    ///      reads the signer's current {Nonces} value at execution time and folds it into
    ///      the struct hash through the typehash, so it must be signed but never sent.
    ///      `deadline` is a uint48, not the uint256 the permit signature uses.
    function _forwardRequest(
        ERC2771Forwarder forwarder,
        uint256 signerKey,
        address to,
        bytes memory data,
        uint256 requestGas,
        uint48 deadline
    ) internal view returns (ERC2771Forwarder.ForwardRequestData memory request) {
        request = ERC2771Forwarder.ForwardRequestData({
            from: vm.addr(signerKey),
            to: to,
            value: 0,
            gas: requestGas,
            deadline: deadline,
            data: data,
            signature: ""
        });
        request.signature = _signForwardRequest(forwarder, signerKey, request);
    }

    function _signForwardRequest(
        ERC2771Forwarder forwarder,
        uint256 signerKey,
        ERC2771Forwarder.ForwardRequestData memory request
    ) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, _forwardRequestDigest(forwarder, request));
        return abi.encodePacked(r, s, v);
    }

    /// @dev Always hashed against the signer's CURRENT forwarder nonce, which is what makes
    ///      a replayed request recover to a different address instead of executing twice.
    function _forwardRequestDigest(
        ERC2771Forwarder forwarder,
        ERC2771Forwarder.ForwardRequestData memory request
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                FORWARD_REQUEST_TYPEHASH,
                request.from,
                request.to,
                request.value,
                request.gas,
                forwarder.nonces(request.from),
                request.deadline,
                keccak256(request.data)
            )
        );

        return MessageHashUtils.toTypedDataHash(_erc5267DomainSeparator(address(forwarder)), structHash);
    }

    /// @dev EIP-712 domain name of the deployed forwarder, taken from the constant the deploy
    ///      scripts read. Each suite deploys its own forwarder and reads the domain back via
    ///      ERC-5267, so this is the name the suites deploy *with* — spelling it out again here
    ///      would let the tests keep passing against a name production no longer uses.
    string internal constant FORWARDER_NAME = ForwarderConfig.NAME;

    uint256 internal constant WAGER = DuelMeTestConstants.WAGER;
    uint96 internal constant MIN_WAGER = DuelMeTestConstants.MIN_WAGER;
    bytes32 internal constant DEFAULT_INVITE_SECRET = DuelMeTestConstants.DEFAULT_INVITE_SECRET;

    /// @dev Assigned in each suite's `setUp` from `duelMe.hashInviteSecret(DEFAULT_INVITE_SECRET)`;
    ///      see `UNSET_INVITE_HASH` for why the placeholder is what it is.
    bytes32 internal DEFAULT_INVITE_HASH = DuelMeTestConstants.UNSET_INVITE_HASH;

    /// @dev Signs a request and pushes it through the forwarder as `relayer` would. The
    ///      verify assertion is deliberately inside the shared helper: a suite that forgot it
    ///      would still pass while silently relaying requests the forwarder would refuse.
    function _relayAs(
        ERC2771Forwarder forwarder,
        address relayer,
        uint256 signerKey,
        address to,
        bytes memory data
    ) internal {
        ERC2771Forwarder.ForwardRequestData memory request = _forwardRequest(forwarder, signerKey, to, data);

        assertTrue(forwarder.verify(request), "request should verify");

        vm.prank(relayer);
        forwarder.execute(request);
    }

    function _signPermit(address token, uint256 signerKey, address spender, uint256 value, uint256 deadline)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        address owner = vm.addr(signerKey);

        bytes32 structHash =
            keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, IERC20Permit(token).nonces(owner), deadline));

        (v, r, s) = vm.sign(signerKey, MessageHashUtils.toTypedDataHash(_tokenDomainSeparator(token), structHash));
    }
}
