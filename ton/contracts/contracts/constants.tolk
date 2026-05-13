// DuelMe protocol constants. Match the Mini App / Solidity implementation.

const MIN_WAGER = ton("1");                 // Minimum wager (nanoTON).
const CLAIM_TIMEOUT_SEC = 3600;             // Confirm/dispute window.
const EMERGENCY_DELAY_SEC = 30 * 86400;     // Emergency-withdraw timelock.

const MAX_MESSAGE_BYTES = 128;
const MAX_MESSAGE_CODEPOINTS = 32;

const STORAGE_RESERVE = ton("0.05");        // Buffer for contract storage rent.
const FORWARD_FEE = ton("0.01");            // Funds outgoing claim/refund messages.
