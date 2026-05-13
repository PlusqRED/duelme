// DuelMe action handlers. Each one validates preconditions, mutates the
// relevant `Duel` record + `PlayerStats`, persists storage, and emits any
// outgoing claim / refund payments via TON message sends.

import "constants"
import "errors"
import "messages"
import "storage"
import "utils"

// ---- common helpers ---------------------------------------------------------

fun assertNotPaused(s: Storage): void {
    assert (!s.paused) throw Errors.Paused;
}

fun assertParticipant(d: Duel, who: address): void {
    val isCreator = d.creator == who;
    val isOpponent = d.opponent != null && d.opponent! == who;
    assert (isCreator || isOpponent) throw Errors.NotAParticipant;
}

fun loadDuel(s: Storage, id: uint64): Duel {
    val r = s.duels.get(id);
    assert (r.isFound) throw Errors.DuelNotFound;
    return r.loadValue();
}

fun statsFor(s: Storage, who: address): PlayerStats {
    val r = s.stats.get(who);
    if (r.isFound) {
        return r.loadValue();
    }
    return PlayerStats { duelsHonored: 0, duelsAbandoned: 0 };
}

fun sendTon(dest: address, amount: coins, queryId: uint64, duelId: uint64): void {
    val payoutMessage = createMessage({
        bounce: BounceMode.RichBounce,
        value: amount,
        dest,
        body: ClaimReceiptEvt { queryId, duelId, amount },
    });
    payoutMessage.send(SEND_MODE_PAY_FEES_SEPARATELY);
}

// ---- create / join / decline / cancel --------------------------------------

fun handleCreateDuel(mutate s: Storage, ctx: MsgCtx, msg: CreateDuelMsg): void {
    assertNotPaused(s);
    assert (ctx.value >= MIN_WAGER + STORAGE_RESERVE) throw Errors.ValueBelowRequired;
    assert (msg.inviteHash != 0) throw Errors.InvalidInviteHash;
    validateMessage(msg.message);

    val wager: coins = ctx.value - STORAGE_RESERVE;
    assert (wager >= MIN_WAGER) throw Errors.InvalidWager;

    val duelId: uint64 = s.duelCount;
    s.duelCount += 1;

    val nowSec: uint32 = blockchain.now() as uint32;
    val duel = Duel {
        creator: ctx.sender,
        opponent: null,
        wagerAmount: wager,
        creatorPayout: 0,
        opponentPayout: 0,
        createdAt: nowSec,
        fundedAt: 0,
        state: DuelState.Created as uint8,
        creatorClaimed: false,
        opponentClaimed: false,
        claim: emptyClaim().toCell(),
        meta: DuelMeta {
            inviteHash: msg.inviteHash,
            cancelRequestedAt: 0,
            claimTimestamp: 0,
            finalizedAt: 0,
        }.toCell(),
        message: msg.message,
    };
    s.duels.set(duelId, duel);
}

fun handleJoinDuel(mutate s: Storage, ctx: MsgCtx, msg: JoinDuelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.Created as uint8) throw Errors.NotInCreatedState;
    assert (ctx.sender != d.creator) throw Errors.CannotJoinOwnDuel;
    val meta = d.meta.load();
    assert (hashInviteSecret(msg.inviteSecret) == meta.inviteHash) throw Errors.InvalidInviteSecret;
    assert (ctx.value >= d.wagerAmount + FORWARD_FEE) throw Errors.ValueBelowRequired;

    d.opponent = ctx.sender;
    d.fundedAt = blockchain.now() as uint32;
    d.state = DuelState.Funded as uint8;
    s.duels.set(msg.duelId, d);

    val excess: coins = ctx.value - d.wagerAmount;
    if (excess > FORWARD_FEE) {
        sendTon(ctx.sender, excess - FORWARD_FEE, msg.queryId, msg.duelId);
    }
}

fun handleDeclineDuel(mutate s: Storage, ctx: MsgCtx, msg: DeclineDuelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.Created as uint8) throw Errors.NotInCreatedState;
    assert (ctx.sender != d.creator) throw Errors.CreatorCannotDecline;
    var meta = d.meta.load();
    assert (hashInviteSecret(msg.inviteSecret) == meta.inviteHash) throw Errors.InvalidInviteSecret;

    val nowSec: uint32 = blockchain.now() as uint32;
    d.opponent = ctx.sender;
    d.state = DuelState.Declined as uint8;
    d.creatorPayout = d.wagerAmount;
    d.creatorClaimed = false;
    d.opponentPayout = 0;
    d.opponentClaimed = false;
    meta.finalizedAt = nowSec;
    d.meta = meta.toCell();
    s.duels.set(msg.duelId, d);
}

fun handleCancelDuel(mutate s: Storage, ctx: MsgCtx, msg: CancelDuelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.Created as uint8) throw Errors.NotInCreatedState;
    assert (ctx.sender == d.creator) throw Errors.OnlyCreator;

    val nowSec: uint32 = blockchain.now() as uint32;
    var meta = d.meta.load();
    meta.finalizedAt = nowSec;
    d.meta = meta.toCell();
    d.state = DuelState.Cancelled as uint8;
    d.creatorPayout = d.wagerAmount;
    d.creatorClaimed = false;
    s.duels.set(msg.duelId, d);
}

// ---- claim / admit / confirm / dispute -------------------------------------

fun handleClaimVictory(mutate s: Storage, ctx: MsgCtx, msg: ClaimVictoryMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.Funded as uint8) throw Errors.NotInFundedState;
    assertParticipant(d, ctx.sender);

    val nowSec: uint32 = blockchain.now() as uint32;
    var claim = d.claim.load();
    var meta = d.meta.load();
    claim.claimedWinner = ctx.sender;
    claim.claimedBy = ctx.sender;
    meta.claimTimestamp = nowSec;
    d.claim = claim.toCell();
    d.meta = meta.toCell();
    d.state = DuelState.WinnerClaimed as uint8;
    s.duels.set(msg.duelId, d);
}

fun handleAdmitDefeat(mutate s: Storage, ctx: MsgCtx, msg: AdmitDefeatMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.Funded as uint8) throw Errors.NotInFundedState;
    assertParticipant(d, ctx.sender);

    val nowSec: uint32 = blockchain.now() as uint32;
    val winner: address = ctx.sender == d.creator ? d.opponent! : d.creator;
    var claim = d.claim.load();
    var meta = d.meta.load();
    claim.claimedWinner = winner;
    claim.claimedBy = ctx.sender;
    meta.claimTimestamp = nowSec;
    d.claim = claim.toCell();
    d.meta = meta.toCell();
    d.state = DuelState.WinnerClaimed as uint8;
    s.duels.set(msg.duelId, d);
}

fun handleConfirmResult(mutate s: Storage, ctx: MsgCtx, msg: ConfirmResultMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.WinnerClaimed as uint8) throw Errors.NotInWinnerClaimedState;
    assertParticipant(d, ctx.sender);

    val nowSec: uint32 = blockchain.now() as uint32;
    val claim = d.claim.load();
    var meta = d.meta.load();
    assert (ctx.sender != claim.claimedBy!) throw Errors.CannotConfirmOwnClaim;

    meta.finalizedAt = nowSec;
    d.meta = meta.toCell();
    d.state = DuelState.Resolved as uint8;

    var creatorStats = statsFor(s, d.creator);
    var oppStats = statsFor(s, d.opponent!);
    creatorStats.duelsHonored += 1;
    oppStats.duelsHonored += 1;
    s.stats.set(d.creator, creatorStats);
    s.stats.set(d.opponent!, oppStats);

    val totalPayout: coins = d.wagerAmount * 2;
    if (claim.claimedWinner! == d.creator) {
        d.creatorPayout = totalPayout;
        d.opponentPayout = 0;
    } else {
        d.creatorPayout = 0;
        d.opponentPayout = totalPayout;
    }
    d.creatorClaimed = false;
    d.opponentClaimed = false;
    s.duels.set(msg.duelId, d);
}

fun handleDisputeResult(mutate s: Storage, ctx: MsgCtx, msg: DisputeResultMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.WinnerClaimed as uint8) throw Errors.NotInWinnerClaimedState;
    assertParticipant(d, ctx.sender);

    val claim = d.claim.load();
    assert (ctx.sender != claim.claimedBy!) throw Errors.CannotDisputeOwnClaim;

    val nowSec: uint32 = blockchain.now() as uint32;
    var meta = d.meta.load();
    meta.finalizedAt = nowSec;
    d.meta = meta.toCell();
    d.state = DuelState.Disputed as uint8;
    d.creatorPayout = d.wagerAmount;
    d.opponentPayout = d.wagerAmount;
    d.creatorClaimed = false;
    d.opponentClaimed = false;
    s.duels.set(msg.duelId, d);
}

// ---- mutual cancellation ---------------------------------------------------

fun handleRequestMutualCancel(mutate s: Storage, ctx: MsgCtx, msg: RequestMutualCancelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.Funded as uint8) throw Errors.NotInFundedState;
    assertParticipant(d, ctx.sender);

    val nowSec: uint32 = blockchain.now() as uint32;
    var claim = d.claim.load();
    var meta = d.meta.load();
    claim.cancelRequestedBy = ctx.sender;
    meta.cancelRequestedAt = nowSec;
    d.claim = claim.toCell();
    d.meta = meta.toCell();
    d.state = DuelState.MutualCancelRequested as uint8;
    s.duels.set(msg.duelId, d);
}

fun handleAcceptMutualCancel(mutate s: Storage, ctx: MsgCtx, msg: AcceptMutualCancelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.MutualCancelRequested as uint8) throw Errors.NotInMutualCancelState;
    assertParticipant(d, ctx.sender);
    val claim = d.claim.load();
    assert (ctx.sender != claim.cancelRequestedBy!) throw Errors.RequesterCannotAccept;

    val nowSec: uint32 = blockchain.now() as uint32;
    var meta = d.meta.load();
    meta.finalizedAt = nowSec;
    d.meta = meta.toCell();
    d.state = DuelState.MutuallyCancelled as uint8;
    d.creatorPayout = d.wagerAmount;
    d.opponentPayout = d.wagerAmount;
    d.creatorClaimed = false;
    d.opponentClaimed = false;
    s.duels.set(msg.duelId, d);
}

fun handleDeclineMutualCancel(mutate s: Storage, ctx: MsgCtx, msg: DeclineMutualCancelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.MutualCancelRequested as uint8) throw Errors.NotInMutualCancelState;
    assertParticipant(d, ctx.sender);
    var claim = d.claim.load();
    assert (ctx.sender != claim.cancelRequestedBy!) throw Errors.RequesterCannotDecline;

    var meta = d.meta.load();
    claim.cancelRequestedBy = null;
    meta.cancelRequestedAt = 0;
    d.claim = claim.toCell();
    d.meta = meta.toCell();
    d.state = DuelState.Funded as uint8;
    s.duels.set(msg.duelId, d);
}

fun handleWithdrawMutualCancel(mutate s: Storage, ctx: MsgCtx, msg: WithdrawMutualCancelMsg): void {
    assertNotPaused(s);
    var d = loadDuel(s, msg.duelId);
    assert (d.state == DuelState.MutualCancelRequested as uint8) throw Errors.NotInMutualCancelState;
    var claim = d.claim.load();
    assert (claim.cancelRequestedBy != null && ctx.sender == claim.cancelRequestedBy!) throw Errors.OnlyRequester;

    var meta = d.meta.load();
    claim.cancelRequestedBy = null;
    meta.cancelRequestedAt = 0;
    d.claim = claim.toCell();
    d.meta = meta.toCell();
    d.state = DuelState.Funded as uint8;
    s.duels.set(msg.duelId, d);
}

// ---- refund / claim --------------------------------------------------------

fun refundOne(mutate s: Storage, duelId: uint64): bool {
    val r = s.duels.get(duelId);
    if (!r.isFound) {
        return false;
    }
    var d = r.loadValue();
    if (d.state != DuelState.WinnerClaimed as uint8) {
        return false;
    }
    val meta = d.meta.load();
    val nowSec: uint32 = blockchain.now() as uint32;
    if (nowSec < meta.claimTimestamp + CLAIM_TIMEOUT_SEC) {
        return false;
    }
    var metaMut = meta;
    metaMut.finalizedAt = nowSec;
    d.meta = metaMut.toCell();
    d.state = DuelState.Refunded as uint8;
    d.creatorPayout = d.wagerAmount;
    d.opponentPayout = d.wagerAmount;
    d.creatorClaimed = false;
    d.opponentClaimed = false;

    val claim = d.claim.load();
    var claimerStats = statsFor(s, claim.claimedBy!);
    claimerStats.duelsHonored += 1;
    s.stats.set(claim.claimedBy!, claimerStats);

    val nonResponder: address = claim.claimedBy! == d.creator ? d.opponent! : d.creator;
    var nrStats = statsFor(s, nonResponder);
    nrStats.duelsAbandoned += 1;
    s.stats.set(nonResponder, nrStats);

    s.duels.set(duelId, d);
    return true;
}

fun handleRefund(mutate s: Storage, _ctx: MsgCtx, msg: RefundMsg): void {
    assertNotPaused(s);
    val ok = refundOne(mutate s, msg.duelId);
    assert (ok) throw Errors.ClaimTimeoutNotReached;
}

fun claimOne(mutate s: Storage, duelId: uint64, player: address): coins {
    val r = s.duels.get(duelId);
    if (!r.isFound) {
        return 0;
    }
    var d = r.loadValue();
    var amount: coins = 0;
    if (player == d.creator) {
        if (d.creatorPayout > 0 && !d.creatorClaimed) {
            d.creatorClaimed = true;
            amount = d.creatorPayout;
        }
    } else if (d.opponent != null && player == d.opponent!) {
        if (d.opponentPayout > 0 && !d.opponentClaimed) {
            d.opponentClaimed = true;
            amount = d.opponentPayout;
        }
    }
    if (amount > 0) {
        s.duels.set(duelId, d);
    }
    return amount;
}

fun handleClaimPayout(mutate s: Storage, ctx: MsgCtx, msg: ClaimPayoutMsg): void {
    assertNotPaused(s);
    val amount = claimOne(mutate s, msg.duelId, ctx.sender);
    assert (amount > 0) throw Errors.NothingToClaim;
    sendTon(ctx.sender, amount, msg.queryId, msg.duelId);
}

fun handleClaimPayoutsBatch(mutate s: Storage, ctx: MsgCtx, msg: ClaimPayoutsBatchMsg): void {
    assertNotPaused(s);
    var head = msg.duelIds.beginParse();
    val count: int = head.loadUint(16);
    var totalAmount: coins = 0;
    var remaining = count;
    while (remaining > 0) {
        while (head.remainingBitsCount() < 64) {
            assert (head.remainingRefsCount() > 0) throw Errors.InvalidAmount;
            head = head.loadRef().beginParse();
        }
        val id: uint64 = head.loadUint(64) as uint64;
        totalAmount += claimOne(mutate s, id, ctx.sender);
        remaining -= 1;
    }
    assert (totalAmount > 0) throw Errors.NothingToClaim;
    sendTon(ctx.sender, totalAmount, msg.queryId, 0);
}

fun handleRefundAndClaim(mutate s: Storage, ctx: MsgCtx, msg: RefundAndClaimMsg): void {
    assertNotPaused(s);
    var head = msg.duelIds.beginParse();
    val count: int = head.loadUint(16);
    var remaining = count;
    var i: int = 0;
    while (i < count && remaining > 0) {
        while (head.remainingBitsCount() < 64) {
            assert (head.remainingRefsCount() > 0) throw Errors.InvalidAmount;
            head = head.loadRef().beginParse();
        }
        val id: uint64 = head.loadUint(64) as uint64;
        refundOne(mutate s, id);
        i += 1;
        remaining -= 1;
    }

    var tail = msg.duelIds.beginParse();
    tail.loadUint(16); // skip count
    var totalAmount: coins = 0;
    i = 0;
    while (i < count) {
        while (tail.remainingBitsCount() < 64) {
            assert (tail.remainingRefsCount() > 0) throw Errors.InvalidAmount;
            tail = tail.loadRef().beginParse();
        }
        val id: uint64 = tail.loadUint(64) as uint64;
        totalAmount += claimOne(mutate s, id, ctx.sender);
        i += 1;
    }
    assert (totalAmount > 0) throw Errors.NothingToClaim;
    sendTon(ctx.sender, totalAmount, msg.queryId, 0);
}

// ---- admin -----------------------------------------------------------------

fun assertOwner(s: Storage, who: address): void {
    assert (who == s.owner) throw Errors.OnlyOwner;
}

fun handlePause(mutate s: Storage, ctx: MsgCtx): void {
    assertOwner(s, ctx.sender);
    s.paused = true;
}

fun handleUnpause(mutate s: Storage, ctx: MsgCtx): void {
    assertOwner(s, ctx.sender);
    s.paused = false;
}

fun handleRequestEmergency(mutate s: Storage, ctx: MsgCtx, msg: RequestEmergencyMsg): void {
    assertOwner(s, ctx.sender);
    assert (msg.amount > 0) throw Errors.InvalidAmount;
    val requestId: uint64 = s.emergencyNonce;
    s.emergencyNonce += 1;
    s.emergencyRequests.set(requestId, EmergencyRequest {
        recipient: msg.recipient,
        amount: msg.amount,
        requestedAt: blockchain.now() as uint32,
    });
}

fun handleCancelEmergency(mutate s: Storage, ctx: MsgCtx, msg: CancelEmergencyMsg): void {
    assertOwner(s, ctx.sender);
    val r = s.emergencyRequests.get(msg.requestId);
    assert (r.isFound) throw Errors.RequestNotFound;
    s.emergencyRequests.delete(msg.requestId);
}

fun handleExecuteEmergency(mutate s: Storage, ctx: MsgCtx, msg: ExecuteEmergencyMsg): void {
    assertOwner(s, ctx.sender);
    val r = s.emergencyRequests.get(msg.requestId);
    assert (r.isFound) throw Errors.RequestNotFound;
    val req = r.loadValue();
    val nowSec: uint32 = blockchain.now() as uint32;
    assert (nowSec >= req.requestedAt + EMERGENCY_DELAY_SEC) throw Errors.TimelockNotExpired;
    s.emergencyRequests.delete(msg.requestId);
    sendTon(req.recipient, req.amount, msg.queryId, 0);
}

fun handleTransferOwnership(mutate s: Storage, ctx: MsgCtx, msg: TransferOwnershipMsg): void {
    assertOwner(s, ctx.sender);
    s.owner = msg.newOwner;
}
