// DuelMe error codes. Kept in the [400, 600) range to avoid colliding with
// TVM-reserved codes (0..63) or common framework codes.
enum Errors {
    // Validation
    InvalidWager           = 400
    InvalidInviteHash      = 401
    InvalidInviteSecret    = 402
    MessageTooLong         = 403
    InvalidUtf8            = 404
    InvalidRecipient       = 405
    InvalidAmount          = 406
    ValueBelowRequired     = 407

    // Access control
    NotAParticipant        = 410
    CannotJoinOwnDuel      = 411
    CreatorCannotDecline   = 412
    OnlyCreator            = 413
    OnlyOwner              = 414
    OnlyRequester          = 415
    RequesterCannotAccept  = 416
    RequesterCannotDecline = 417
    CannotConfirmOwnClaim  = 418
    CannotDisputeOwnClaim  = 419

    // State
    NotInCreatedState         = 420
    NotInFundedState          = 421
    NotInWinnerClaimedState   = 422
    NotInMutualCancelState    = 423
    ClaimTimeoutNotReached    = 424
    NothingToClaim            = 425
    Paused                    = 426
    RequestNotFound           = 427
    TimelockNotExpired        = 428
    CannotRescueTon           = 429
    DuelNotFound              = 430

    UnknownOpcode             = 0xFFFF
}
