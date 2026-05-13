// DuelMe — P2P TON duel platform.
//
// A single master contract that maintains:
//   * an autoincrement registry of duels keyed by uint64
//   * per-player honor / abandon counters used as on-chain reputation
//   * an admin (owner) flag that can pause flows and request timelocked
//     emergency rescue of mis-sent TON
//
// Duel lifecycle states mirror the EVM DuelMe.sol implementation so the
// Telegram Mini App can reuse the same timeline / status surfaces.
// Payouts are pull-based: any state transition that should pay a player
// sets their `creatorPayout` / `opponentPayout` slot, the player then
// explicitly sends a `ClaimPayout` message to drain it.

import "errors"
import "handlers"
import "messages"
import "storage"

contract DuelMe {
    author: "DuelMe Team"
    version: "0.1.0"
    description: "P2P TON duel platform — pull-based payouts, on-chain reputation"
    storage: Storage
    incomingMessages: AllowedMessage
}

fun onInternalMessage(in: InMessage) {
    // Empty bodies and TON top-ups are silently accepted so the deployer can
    // pre-fund the contract for storage rent without a dedicated opcode.
    if (in.body.isEmpty()) {
        return;
    }

    var s = lazy Storage.load();
    val msg = lazy AllowedMessage.fromSlice(in.body);
    val ctx = MsgCtx { sender: in.senderAddress, value: in.valueCoins };

    match (msg) {
        CreateDuelMsg => { handleCreateDuel(mutate s, ctx, msg); }
        JoinDuelMsg => { handleJoinDuel(mutate s, ctx, msg); }
        DeclineDuelMsg => { handleDeclineDuel(mutate s, ctx, msg); }
        CancelDuelMsg => { handleCancelDuel(mutate s, ctx, msg); }
        ClaimVictoryMsg => { handleClaimVictory(mutate s, ctx, msg); }
        AdmitDefeatMsg => { handleAdmitDefeat(mutate s, ctx, msg); }
        ConfirmResultMsg => { handleConfirmResult(mutate s, ctx, msg); }
        DisputeResultMsg => { handleDisputeResult(mutate s, ctx, msg); }
        RequestMutualCancelMsg => { handleRequestMutualCancel(mutate s, ctx, msg); }
        AcceptMutualCancelMsg => { handleAcceptMutualCancel(mutate s, ctx, msg); }
        DeclineMutualCancelMsg => { handleDeclineMutualCancel(mutate s, ctx, msg); }
        WithdrawMutualCancelMsg => { handleWithdrawMutualCancel(mutate s, ctx, msg); }
        RefundMsg => { handleRefund(mutate s, ctx, msg); }
        ClaimPayoutMsg => { handleClaimPayout(mutate s, ctx, msg); }
        ClaimPayoutsBatchMsg => { handleClaimPayoutsBatch(mutate s, ctx, msg); }
        RefundAndClaimMsg => { handleRefundAndClaim(mutate s, ctx, msg); }
        PauseMsg => { handlePause(mutate s, ctx); }
        UnpauseMsg => { handleUnpause(mutate s, ctx); }
        RequestEmergencyMsg => { handleRequestEmergency(mutate s, ctx, msg); }
        ExecuteEmergencyMsg => { handleExecuteEmergency(mutate s, ctx, msg); }
        CancelEmergencyMsg => { handleCancelEmergency(mutate s, ctx, msg); }
        TransferOwnershipMsg => { handleTransferOwnership(mutate s, ctx, msg); }
        else => { assert (in.body.isEmpty()) throw Errors.UnknownOpcode; }
    }

    s.save();
}

fun onBouncedMessage(in: InMessageBounced) {
    var s = lazy Storage.load();
    var body = in.bouncedBody;
    if (body.remainingBitsCount() < 32 + 32 + 64 + 64) {
        return;
    }
    body.skipBits(32);  // bounce-prefix injected by the runtime
    val opcode: uint32 = body.loadUint(32) as uint32;
    val _queryId: uint64 = body.loadUint(64) as uint64;
    val duelId: uint64 = body.loadUint(64) as uint64;
    if (opcode != 0x9d4e1203) {
        return;
    }

    val r = s.duels.get(duelId);
    if (!r.isFound) {
        return;
    }
    var d = r.loadValue();
    val sender = in.senderAddress;
    if (sender == d.creator) {
        d.creatorClaimed = false;
    } else if (d.opponent != null && sender == d.opponent!) {
        d.opponentClaimed = false;
    }
    s.duels.set(duelId, d);
    s.save();
}

// ---- getters --------------------------------------------------------------

get fun duelCount(): uint64 {
    val s = lazy Storage.load();
    return s.duelCount;
}

get fun isPaused(): bool {
    val s = lazy Storage.load();
    return s.paused;
}

get fun owner(): address {
    val s = lazy Storage.load();
    return s.owner;
}

get fun getDuel(duelId: uint64): Duel {
    val s = lazy Storage.load();
    val r = s.duels.get(duelId);
    assert (r.isFound) throw Errors.DuelNotFound;
    return r.loadValue();
}

get fun getPlayerStats(player: address): (uint32, uint32) {
    val s = lazy Storage.load();
    val r = s.stats.get(player);
    if (!r.isFound) {
        return (0, 0);
    }
    val stats = r.loadValue();
    return (stats.duelsHonored, stats.duelsAbandoned);
}

get fun getEmergencyRequest(requestId: uint64): EmergencyRequest {
    val s = lazy Storage.load();
    val r = s.emergencyRequests.get(requestId);
    assert (r.isFound) throw Errors.RequestNotFound;
    return r.loadValue();
}
