// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/DuelMe.sol";

/// @notice Deploys MockUSDT + DuelMe to testnet
/// Usage: forge script script/Deploy.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast --verify
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            // Try reading as hex string without 0x prefix
            string memory pkStr = vm.envString("PRIVATE_KEY");
            deployerPrivateKey = vm.parseUint(string.concat("0x", pkStr));
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDT
        MockUSDT mockUsdt = new MockUSDT();
        console.log("MockUSDT deployed at:", address(mockUsdt));

        // 2. Deploy DuelMe with MockUSDT address
        DuelMe duelMe = new DuelMe(address(mockUsdt));
        console.log("DuelMe deployed at:", address(duelMe));

        // 3. Mint 10,000 USDT to deployer for testing
        mockUsdt.faucet(); // 1000 USDT
        console.log("Minted 1000 USDT to deployer");

        vm.stopBroadcast();
    }
}
