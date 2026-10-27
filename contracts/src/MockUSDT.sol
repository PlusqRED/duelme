// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title MockUSDT - Testnet USDT for DuelMe testing
/// @notice Anyone can mint tokens. DO NOT use in production.
/// @dev Deliberately mirrors mainnet USDT (USD₮0 on Arbitrum One) in the two places where a
///      mismatch breaks EIP-2612 signatures silently rather than loudly:
///
///      1. The name is `USD₮0`, with U+20AE, not an ASCII "T". It hashes into the EIP-712
///         domain, so a client that hardcodes an ASCII name signs against the wrong domain.
///      2. `eip712Domain()` reverts. Mainnet USD₮0 predates ERC-5267, so the domain has to be
///         rebuilt from `name()` + version "1"; a client that reaches for ERC-5267 would work
///         on a stock OpenZeppelin testnet token and fail in production.
///
///      It also carries USD₮0's EIP-3009 `transferWithAuthorization`, which the wallet menu's
///      relayed transfer is sent through: the same domain as permit, the same typehash and the
///      same revert strings, so the relayer reads one set of reasons on both networks.
///
///      One difference remains and cannot be mirrored here: mainnet USD₮0 validates permit
///      through ERC-1271 whenever the owner address has code (an EIP-7702 delegation is
///      enough), while OpenZeppelin's ERC20Permit always uses ecrecover. That gap is covered
///      by test/UsdtPermitFork.t.sol against the real token.
contract MockUSDT is ERC20, ERC20Permit {
    string private constant TOKEN_NAME = unicode"USD₮0";

    /// @notice EIP-3009's typehash, under the name mainnet USD₮0 exposes it.
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    mapping(address authorizer => mapping(bytes32 nonce => bool used)) private _authorizationStates;

    /// @notice An authorization's nonce was spent, by `transferWithAuthorization`.
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor() ERC20(TOKEN_NAME, "USDT") ERC20Permit(TOKEN_NAME) {}

    /// @notice Whether `authorizer` has already spent `nonce` on an authorization (EIP-3009).
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /// @notice Moves `value` from `from` to `to` on `from`'s EIP-712 signature, sent by anyone
    ///         who holds it (EIP-3009). Each nonce works once per authorizer.
    /// @dev The checks run in mainnet USD₮0's order and fail with its strings.
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp > validAfter, "TetherToken: auth early");
        require(block.timestamp < validBefore, "TetherToken: auth expired");
        require(!_authorizationStates[from][nonce], "TetherToken: auth invalid");
        _requireSignedBy(
            from,
            keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce)),
            v,
            r,
            s
        );

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);
        _transfer(from, to, value);
    }

    function _requireSignedBy(address signer, bytes32 structHash, uint8 v, bytes32 r, bytes32 s) private view {
        (address recovered, ECDSA.RecoverError error,) = ECDSA.tryRecover(_hashTypedDataV4(structHash), v, r, s);
        require(error == ECDSA.RecoverError.NoError && recovered == signer, "TetherToken: invalid signature");
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @inheritdoc EIP712
    /// @dev Reverts on purpose — see the contract-level note. Mainnet USD₮0 has no ERC-5267.
    function eip712Domain()
        public
        pure
        override
        returns (bytes1, string memory, string memory, uint256, address, bytes32, uint256[] memory)
    {
        revert("MockUSDT: no ERC-5267, mirror mainnet USDT");
    }

    /// @notice Mint tokens to any address. Open for testnet use.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Convenience: mint 1000 USDT to caller
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 6);
    }
}
