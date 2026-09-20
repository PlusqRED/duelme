// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "../src/DuelMe.sol";
import "./ForwarderConfig.sol";
import "./TokenFeeProbe.sol";

/// @notice Deploys ERC2771Forwarder + DuelMe against an already-deployed ERC20 (mainnet USDT).
///         Does NOT deploy MockUSDT, mint, or call any faucet.
/// Required env:
///   PRIVATE_KEY        — deployer private key (with or without 0x prefix)
///   USDT_ADDRESS       — canonical Tether USDT on the target chain. Must implement
///                        EIP-2612 permit — the gasless duel flow has no approve fallback.
/// Optional env:
///   EXPECTED_CHAIN_ID  — defaults to 42161 (Arbitrum One). Set to override when
///                        deploying to a different mainnet L2.
/// Usage:
///   forge script script/DeployMainnet.s.sol \
///     --rpc-url $ARBITRUM_RPC_URL \
///     --broadcast --verify \
///     --retries 20 --delay 15
///   The key comes from the [etherscan] block in foundry.toml. Keep the retries — the default of
///   5 is shorter than Arbiscan's queue, and a dropped verification is silent.
contract DeployMainnet is Script {
    uint256 private constant ARBITRUM_ONE_CHAIN_ID = 42161;
    uint96 private constant MIN_WAGER = 300_000; // 0.3 USDT (6 decimals)
    
    /// @dev 1 USDT. Big enough that the smallest basis-point fee cannot round down to zero at
    ///      6 decimals, small enough to ask any deployer to hold it. It never leaves the deployer.
    uint256 private constant FEE_PROBE_AMOUNT = 1_000_000;

    function run() external {
        uint256 expectedChainId = vm.envOr("EXPECTED_CHAIN_ID", ARBITRUM_ONE_CHAIN_ID);
        require(block.chainid == expectedChainId, "Wrong chain: RPC chain id does not match expected mainnet");

        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            string memory pkStr = vm.envString("PRIVATE_KEY");
            deployerPrivateKey = vm.parseUint(string.concat("0x", pkStr));
        }
        address deployer = vm.addr(deployerPrivateKey);

        address usdtAddress = vm.envAddress("USDT_ADDRESS");
        require(usdtAddress != address(0), "USDT_ADDRESS must be set");
        require(usdtAddress.code.length > 0, "USDT_ADDRESS has no code");

        // createDuelWithPermit / joinDuelWithPermit are the only funding paths the gasless
        // flow uses, so a token without EIP-2612 would deploy fine and then strand every
        // player. Probe before spending gas rather than after.
        // The returned word has to be checked too: a contract with a permissive fallback
        // answers any selector with empty returndata, so `success` alone proves nothing.
        (bool hasNonces, bytes memory noncesReturn) =
            usdtAddress.staticcall(abi.encodeCall(IERC20Permit.nonces, (deployer)));
        require(hasNonces && noncesReturn.length == 32, "USDT_ADDRESS does not implement EIP-2612 permit");

        console.log("Deployer:", deployer);
        console.log("USDT:", usdtAddress);
        console.log("Chain id:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // DuelMe pays out exactly twice the wager it recorded, so a token that takes a cut of a
        // transfer would leave duels under-collateralised. The token is immutable, so the question
        // is asked once, here, instead of on every wager for the life of the contract. Needs the
        // deployer to hold at least `FEE_PROBE_AMOUNT`; it is returned by the same transaction.
        TokenFeeProbe.requireNoTransferFee(IERC20(usdtAddress), deployer, FEE_PROBE_AMOUNT);

        ERC2771Forwarder forwarder = new ERC2771Forwarder(ForwarderConfig.NAME);
        DuelMe duelMe = new DuelMe(usdtAddress, MIN_WAGER, address(forwarder));
        vm.stopBroadcast();

        require(duelMe.owner() == deployer, "owner != deployer");
        require(address(duelMe.usdt()) == usdtAddress, "usdt() mismatch");
        require(duelMe.minWager() == MIN_WAGER, "minWager mismatch");
        require(!duelMe.paused(), "deployed paused");
        require(!duelMe.duelCreationPaused(), "deployed with duel creation paused");
        require(duelMe.pendingOwner() == address(0), "deployed with a pending owner");
        require(duelMe.duelCount() == 0, "duelCount != 0");
        require(duelMe.trustedForwarder() == address(forwarder), "trustedForwarder mismatch");
        require(duelMe.isTrustedForwarder(address(forwarder)), "forwarder not trusted");

        console.log("ERC2771Forwarder deployed at:", address(forwarder));
        console.log("DuelMe deployed at:", address(duelMe));
    }
}
