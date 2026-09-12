// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Script.sol";
import "../src/DuelMe.sol";

/// @notice Deploys DuelMe against an already-deployed ERC20 (mainnet USDT).
///         Does NOT deploy MockUSDT, mint, or call any faucet.
/// Required env:
///   PRIVATE_KEY        — deployer private key (with or without 0x prefix)
///   USDT_ADDRESS       — canonical Tether USDT on the target chain
/// Optional env:
///   EXPECTED_CHAIN_ID  — defaults to 42161 (Arbitrum One). Set to override when
///                        deploying to a different mainnet L2.
/// Usage:
///   forge script script/DeployMainnet.s.sol \
///     --rpc-url $ARBITRUM_RPC_URL \
///     --broadcast --verify \
///     --etherscan-api-key $ARBISCAN_API_KEY
contract DeployMainnet is Script {
    uint256 private constant ARBITRUM_ONE_CHAIN_ID = 42161;
    uint96 private constant MIN_WAGER = 300_000; // 0.3 USDT (6 decimals)

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

        console.log("Deployer:", deployer);
        console.log("USDT:", usdtAddress);
        console.log("Chain id:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);
        DuelMe duelMe = new DuelMe(usdtAddress, MIN_WAGER);
        vm.stopBroadcast();

        require(duelMe.owner() == deployer, "owner != deployer");
        require(address(duelMe.usdt()) == usdtAddress, "usdt() mismatch");
        require(duelMe.minWager() == MIN_WAGER, "minWager mismatch");
        require(!duelMe.paused(), "deployed paused");
        require(duelMe.duelCount() == 0, "duelCount != 0");

        console.log("DuelMe deployed at:", address(duelMe));
    }
}
