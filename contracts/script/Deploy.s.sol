// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "../src/MockUSDT.sol";
import "../src/DuelMe.sol";
import "./ForwarderConfig.sol";
import "./TokenFeeProbe.sol";

/// @notice Deploys ERC2771Forwarder + MockUSDT + DuelMe to testnet
/// Usage: forge script script/Deploy.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast \
///        --verify --retries 20 --delay 15
///
/// The retry flags matter: Arbiscan queues submissions for longer than forge's default 5 tries,
/// and forge then gives up on a contract that is already deployed — it exits non-zero on a deploy
/// that succeeded, leaving a live but unverified contract. That is exactly how DuelMe was left
/// unverified by the 2026-09-20 testnet deploy while the other two went through. Re-verify in
/// place with the addresses from broadcast/Deploy.s.sol/421614/run-latest.json:
///
///   forge verify-contract --chain-id 421614 \
///     --compiler-version v0.8.34+commit.80d5c536 --num-of-optimizations 200 \
///     --constructor-args $(cast abi-encode "constructor(address,uint96,address)" \
///         <mockUsdt> 300000 <forwarder>) \
///     --retries 20 --delay 15 <duelMe> src/DuelMe.sol:DuelMe
contract DeployAll is Script {
    uint96 private constant MIN_WAGER = 300_000; // 0.3 USDT (6 decimals)

    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            // Try reading as hex string without 0x prefix
            string memory pkStr = vm.envString("PRIVATE_KEY");
            deployerPrivateKey = vm.parseUint(string.concat("0x", pkStr));
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the ERC-2771 forwarder that relays gasless duel actions
        ERC2771Forwarder forwarder = new ERC2771Forwarder(ForwarderConfig.NAME);
        console.log("ERC2771Forwarder deployed at:", address(forwarder));

        // 2. Deploy MockUSDT
        MockUSDT mockUsdt = new MockUSDT();
        console.log("MockUSDT deployed at:", address(mockUsdt));

        // 3. Deploy DuelMe with MockUSDT + forwarder addresses
        DuelMe duelMe = new DuelMe(address(mockUsdt), MIN_WAGER, address(forwarder));
        console.log("DuelMe deployed at:", address(duelMe));

        // 4. Mint 1000 USDT to deployer for testing
        mockUsdt.faucet();
        console.log("Minted 1000 USDT to deployer");

        // 5. Same guard the mainnet script runs against the real token. MockUSDT takes no fee, so
        //    this always passes here — the point is that the probe itself is exercised on a real
        //    chain on every testnet deploy, rather than first being tried against mainnet USDT.
        TokenFeeProbe.requireNoTransferFee(IERC20(address(mockUsdt)), vm.addr(deployerPrivateKey), 1_000_000);
        console.log("Token fee probe passed");

        vm.stopBroadcast();

        require(duelMe.isTrustedForwarder(address(forwarder)), "forwarder not trusted");
    }
}
