// DuelMe deployment script.
//
// Run:
//   acton script scripts/deploy.tolk --net testnet
//
// This reads the `deployer` wallet from `wallets.toml` (or the project's
// secure store), builds the initial `Storage` with that wallet as the
// owner, and dispatches a deploy message.

import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@contracts/storage"
import "@wrappers/Duelme.gen"

fun main() {
    val deployer = scripts.wallet("deployer");

    val contract = Duelme.fromStorage(Storage {
        owner: deployer.address,
        paused: false,
        duelCount: 0,
        emergencyNonce: 0,
        duels: [],
        stats: [],
        emergencyRequests: [],
    });

    val res = contract.deploy(deployer.address, { value: ton("0.5") });
    println(res.waitForTrace());

    println("Deployed DuelMe to {}", contract.address);
    println("Initial owner: {}", contract.owner());
    println("Initial duelCount: {}", contract.duelCount());
    println("Paused: {}", contract.isPaused());
}
