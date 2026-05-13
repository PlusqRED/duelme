// DuelMe contract storage layout.
//
// The duel record holds up to four nullable addresses plus three coins
// amounts and several timestamps. That payload exceeds the 1023-bit TVM
// cell budget when packed inline, so it is split across three sibling
// cells: `Duel` (always-needed essentials), `DuelClaim` (claim/cancel
// addresses), and `DuelMeta` (invite hash + lifecycle timestamps).

enum DuelState {
    Created               = 0
    Funded                = 1
    WinnerClaimed         = 2
    Resolved              = 3
    Refunded              = 4
    Cancelled             = 5
    Declined              = 6
    Disputed              = 7
    MutualCancelRequested = 8
    MutuallyCancelled     = 9
}

struct PlayerStats {
    duelsHonored: uint32 = 0
    duelsAbandoned: uint32 = 0
}

// Claim / cancel addresses are populated lazily as the duel progresses.
struct DuelClaim {
    cancelRequestedBy: address?
    claimedWinner: address?
    claimedBy: address?
}

// Invite hash + timestamps that surface only on confirm/dispute/refund.
struct DuelMeta {
    inviteHash: uint256
    cancelRequestedAt: uint32
    claimTimestamp: uint32
    finalizedAt: uint32
}

struct Duel {
    creator: address
    opponent: address?

    wagerAmount: coins
    creatorPayout: coins = 0
    opponentPayout: coins = 0

    createdAt: uint32
    fundedAt: uint32 = 0

    state: uint8
    creatorClaimed: bool = false
    opponentClaimed: bool = false

    claim: Cell<DuelClaim>
    meta: Cell<DuelMeta>
    message: cell
}

struct EmergencyRequest {
    recipient: address
    amount: coins
    requestedAt: uint32
}

struct Storage {
    owner: address
    paused: bool = false
    duelCount: uint64 = 0
    emergencyNonce: uint64 = 0

    duels: map<uint64, Duel> = []
    stats: map<address, PlayerStats> = []
    emergencyRequests: map<uint64, EmergencyRequest> = []
}

fun Storage.load(): Storage {
    return Storage.fromCell(contract.getData());
}

fun Storage.save(self) {
    contract.setData(self.toCell());
}

fun emptyClaim(): DuelClaim {
    return DuelClaim {
        cancelRequestedBy: null,
        claimedWinner: null,
        claimedBy: null,
    };
}

// `InMessage` is a built-in TVM struct that can't be passed across function
// boundaries — Tolk maps its fields directly to TVM instructions. We mirror
// only the bits we actually need into a regular struct so handlers can be
// written as ordinary Tolk functions.
struct MsgCtx {
    sender: address
    value: coins
}

