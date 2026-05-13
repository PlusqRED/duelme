// Incoming and outgoing message bodies for DuelMe.
//
// Opcodes are picked from the user-defined range above 0x80000000 to avoid
// colliding with TEP-74 / TEP-62 standard token / NFT opcodes.

// ---- Player actions --------------------------------------------------------

struct (0x9d4e1101) CreateDuelMsg {
    queryId: uint64
    inviteHash: uint256
    message: cell
}

struct (0x9d4e1102) JoinDuelMsg {
    queryId: uint64
    duelId: uint64
    inviteSecret: uint256
}

struct (0x9d4e1103) DeclineDuelMsg {
    queryId: uint64
    duelId: uint64
    inviteSecret: uint256
}

struct (0x9d4e1104) CancelDuelMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e1105) ClaimVictoryMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e1106) AdmitDefeatMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e1107) ConfirmResultMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e1108) DisputeResultMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e1109) RequestMutualCancelMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e110a) AcceptMutualCancelMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e110b) DeclineMutualCancelMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e110c) WithdrawMutualCancelMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e110d) RefundMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e110e) ClaimPayoutMsg {
    queryId: uint64
    duelId: uint64
}

struct (0x9d4e110f) ClaimPayoutsBatchMsg {
    queryId: uint64
    duelIds: cell
}

struct (0x9d4e1110) RefundAndClaimMsg {
    queryId: uint64
    duelIds: cell
}

// ---- Admin actions ---------------------------------------------------------

struct (0x9d4e1180) PauseMsg {
    queryId: uint64
}

struct (0x9d4e1181) UnpauseMsg {
    queryId: uint64
}

struct (0x9d4e1182) RequestEmergencyMsg {
    queryId: uint64
    recipient: address
    amount: coins
}

struct (0x9d4e1183) ExecuteEmergencyMsg {
    queryId: uint64
    requestId: uint64
}

struct (0x9d4e1184) CancelEmergencyMsg {
    queryId: uint64
    requestId: uint64
}

struct (0x9d4e1185) TransferOwnershipMsg {
    queryId: uint64
    newOwner: address
}

// ---- Outgoing event ---------------------------------------------------------

struct (0x9d4e1203) ClaimReceiptEvt {
    queryId: uint64
    duelId: uint64
    amount: coins
}

// ---- Sum type for the dispatcher -------------------------------------------

type AllowedMessage =
    | CreateDuelMsg
    | JoinDuelMsg
    | DeclineDuelMsg
    | CancelDuelMsg
    | ClaimVictoryMsg
    | AdmitDefeatMsg
    | ConfirmResultMsg
    | DisputeResultMsg
    | RequestMutualCancelMsg
    | AcceptMutualCancelMsg
    | DeclineMutualCancelMsg
    | WithdrawMutualCancelMsg
    | RefundMsg
    | ClaimPayoutMsg
    | ClaimPayoutsBatchMsg
    | RefundAndClaimMsg
    | PauseMsg
    | UnpauseMsg
    | RequestEmergencyMsg
    | ExecuteEmergencyMsg
    | CancelEmergencyMsg
    | TransferOwnershipMsg
