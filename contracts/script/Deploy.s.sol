// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DuelMe.sol";

contract DeployDuelMe is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdtAddress = vm.envAddress("USDT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        DuelMe duelMe = new DuelMe(usdtAddress);
        vm.stopBroadcast();

        console.log("DuelMe deployed at:", address(duelMe));
    }
}
