// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/// @title DuelMe - A Web3 Gaming Duel Platform
/// @notice Allows two players to wager USDT on a duel with on-chain reputation tracking
/// @dev Uses OpenZeppelin SafeERC20, ReentrancyGuard, Pausable, Ownable2Step and ERC2771Context.
///      Every player-facing entry point resolves its caller through `_msgSender()`, so the
///      same call works both directly and relayed through the single trusted ERC-2771
///      forwarder set at deploy time. The `*WithPermit` variants let a player fund a duel
///      with an EIP-2612 signature instead of a separate `approve` transaction, which is
///      what makes the whole flow gasless for them.
contract DuelMe is ERC2771Context, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;

    // Hard floors baked into the bytecode. The owner-adjustable parameters
    // below can never be set past these bounds, so player protections
    // (dispute window, rug-pull timelock) cannot be weakened after deploy.
    uint96 public constant MIN_WAGER_FLOOR = 100_000; // 0.1 USDT (6 decimals)
    uint64 public constant MIN_CLAIM_TIMEOUT = 1 hours;
    uint64 public constant MIN_EMERGENCY_DELAY = 30 days;
    uint16 public constant MIN_MESSAGE_CODEPOINTS = 32;
    uint16 public constant MIN_MESSAGE_BYTES = 128;

    // The five adjustable parameters below are sized to pack into a single
    // storage slot (96+64+64+16+16 = 256 bits), so createDuel pays one SLOAD
    // for all of them instead of three.
    /// @notice Minimum wager for new duels in USDT (6 decimals). Set at deploy, owner-adjustable,
    ///         never below MIN_WAGER_FLOOR. Keep frontend MIN_WAGER in constants.ts in sync.
    uint96 public minWager;
    /// @notice Window for the opponent to confirm or dispute a victory claim. Applies to in-flight claims.
    uint64 public claimTimeout = MIN_CLAIM_TIMEOUT;
    /// @notice Timelock before an emergency withdrawal can execute. Applies to pending requests.
    uint64 public emergencyDelay = MIN_EMERGENCY_DELAY;
    /// @notice Maximum duel message length in Unicode code points
    uint16 public maxMessageCodepoints = MIN_MESSAGE_CODEPOINTS;
    /// @notice Maximum duel message length in UTF-8 bytes
    uint16 public maxMessageBytes = MIN_MESSAGE_BYTES;

    /// @notice Number of duels ever created, and the id the next one will get.
    /// @dev uint248 so the creation switch below shares this slot. `_createDuel` reads and writes
    ///      this word anyway, which makes reading the switch free rather than a cold SLOAD on
    ///      every create. The ceiling is 4.5e74 duels.
    uint248 public duelCount;

    /// @notice Blocks new duels while leaving every existing one playable.
    /// @dev Deliberately NOT part of `Pausable`. `pause()` is the emergency brake; this is the
    ///      migration switch: when a successor contract goes live, creation stops here while
    ///      funded duels keep resolving and payouts keep flowing, so moving to a new address
    ///      never strands money in this one.
    bool public duelCreationPaused;

    struct EmergencyRequest {
        address token;
        address recipient;
        uint256 amount;
        uint256 requestedAt;
    }

    /// @notice Pending emergency withdrawal requests, keyed by a unique nonce
    mapping(uint256 => EmergencyRequest) public emergencyRequests;
    uint256 public emergencyNonce;

    /// @dev `Nonexistent` occupies the zero value on purpose. Every duel lives in a mapping, so
    ///      an id that was never issued reads back as a struct of zeroes — and while `Created`
    ///      held that value, such a slot was indistinguishable from a duel waiting for an
    ///      opponent: `joinDuel` admitted anyone on it, pulled a zero wager, and left
    ///      `state == Funded` behind for the real duel that later took the id, which
    ///      `_createDuel` writes assuming a virgin entry. Guarding the three entry points that
    ///      accept `Created` fixed the symptom; this makes the slot invalid for every reader,
    ///      including the next entry point somebody adds. `_createDuel` writes the state into a
    ///      slot it already touches, so it costs nothing.
    enum DuelState {
        Nonexistent,
        Created,
        Funded,
        WinnerClaimed,
        Resolved,
        Refunded,
        Cancelled,
        Declined,
        Disputed,
        MutualCancelRequested,
        MutuallyCancelled
    }

    /// @dev Storage layout of a duel: five slots, down from sixteen. Three rules get it there:
    ///      (1) every participant address a duel records is either the creator or the opponent,
    ///          so `claimedWinner` / `claimedBy` / `cancelRequestedBy` are one bit each instead
    ///          of a word each; (2) timestamps are uint40 — good until year 36812 — and share a
    ///          slot; (3) payouts are never stored at all, because they are a pure function of
    ///          the terminal state and the winner (see `_payoutOf`), which also removes the one
    ///          way state and payout could ever disagree.
    ///      `getDuel` still returns the flat, address-and-uint256 shape external clients read
    ///      (see `DuelView`), so none of this packing reaches an integrator.
    struct Duel {
        // slot 0
        address creator;
        uint96 wagerAmount;
        // slot 1
        /// @dev While `Created` this holds the invited opponent (address(0) = open to anyone who
        ///      satisfies the invite). From `Funded` on it holds the player who actually joined,
        ///      and for `Declined` the player who declined.
        address opponent;
        uint40 createdAt;
        uint40 fundedAt;
        DuelState state;
        bool winnerIsCreator;
        // slot 2
        /// @dev bytes32(0) marks an open duel: anyone may join, no secret needed.
        bytes32 inviteHash;
        // slot 3
        uint40 claimTimestamp;
        uint40 cancelRequestedAt;
        uint40 finalizedAt;
        bool claimedByCreator;
        bool cancelRequestedByCreator;
        bool creatorClaimed;
        bool opponentClaimed;
        // slot 4+
        string message;
    }

    /// @notice Flat, client-facing shape of a duel — what `getDuel` and the batch readers return.
    /// @dev Mirrors the fields external integrators have always read, with the packed storage
    ///      expanded back into addresses, uint256 timestamps and materialised payouts.
    ///      `invitedOpponent` is the one addition: while a duel is still waiting it names the
    ///      player it is addressed to (address(0) = open to whoever satisfies the invite), and it
    ///      goes back to address(0) once someone has joined or declined — at which point
    ///      `opponent` is that player.
    struct DuelView {
        address creator;
        address opponent;
        uint256 wagerAmount;
        bytes32 inviteHash;
        string message;
        address claimedWinner;
        address claimedBy;
        address cancelRequestedBy;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 cancelRequestedAt;
        uint256 claimTimestamp;
        uint256 finalizedAt;
        uint256 creatorPayout;
        uint256 opponentPayout;
        bool creatorClaimed;
        bool opponentClaimed;
        DuelState state;
        address invitedOpponent;
    }

    /// @dev Five counters in one slot (4+4+4+4+12 = 28 bytes), so a resolution updates a player's
    ///      whole record within one storage word — the cold slot is paid for once per player.
    struct PlayerStats {
        uint32 duelsHonored;   // resolved normally (both confirmed) or claimed and then timed out
        uint32 duelsAbandoned; // this player was the non-responder in a refund
        uint32 duelsWon;       // resolved in this player's favour
        uint32 duelsLost;      // resolved against this player
        uint96 volume;         // own USDT staked across duels that reached a result or timed out
    }

    mapping(uint256 => Duel) private duels;
    mapping(address => PlayerStats) private playerStats;

    event DuelCreated(
        uint256 indexed duelId,
        address indexed creator,
        address indexed invitedOpponent,
        uint256 wagerAmount,
        bytes32 inviteHash,
        string message
    );
    event DuelJoined(uint256 indexed duelId, address indexed opponent, uint256 wagerAmount);
    event VictoryClaimed(uint256 indexed duelId, address indexed claimedBy, address indexed claimedWinner);
    event DuelResolved(uint256 indexed duelId, address indexed winner, uint256 amount);
    event DuelRefunded(uint256 indexed duelId);
    event DuelCancelled(uint256 indexed duelId);
    event DuelDeclined(uint256 indexed duelId, address indexed declinedBy);
    event DuelDisputed(uint256 indexed duelId, address indexed disputedBy);
    event DuelMutualCancellationRequested(uint256 indexed duelId, address indexed requestedBy);
    event DuelMutualCancellationDeclined(uint256 indexed duelId, address indexed declinedBy);
    event DuelMutualCancellationWithdrawn(uint256 indexed duelId, address indexed withdrawnBy);
    event DuelMutuallyCancelled(uint256 indexed duelId, address indexed requestedBy, address indexed acceptedBy);
    /// @dev `to` is the address that received the funds, which the `*To` entry points make
    ///      routinely different from `player` — an event naming only the claimant would tell an
    ///      indexer the wrong recipient for exactly the cases those variants exist for.
    event DuelPayoutClaimed(uint256 indexed duelId, address indexed player, address indexed to, uint256 amount);
    event EmergencyRequested(uint256 indexed requestId, address indexed token, address indexed recipient, uint256 amount, uint256 executeAfter);
    event EmergencyCancelled(uint256 indexed requestId);
    event EmergencyExecuted(uint256 indexed requestId, address indexed token, address indexed recipient, uint256 amount);
    event MinWagerUpdated(uint256 oldValue, uint256 newValue);
    event ClaimTimeoutUpdated(uint256 oldValue, uint256 newValue);
    event EmergencyDelayUpdated(uint256 oldValue, uint256 newValue);
    event MaxMessageCodepointsUpdated(uint256 oldValue, uint256 newValue);
    event MaxMessageBytesUpdated(uint256 oldValue, uint256 newValue);
    event DuelCreationPausedUpdated(bool paused);

    /// @param _usdt The wager token. Must implement EIP-2612 `permit` for the `*WithPermit` entry points.
    /// @param _minWager Initial minimum wager in USDT (6 decimals), at least MIN_WAGER_FLOOR
    /// @param _trustedForwarder The one ERC-2771 forwarder allowed to relay calls on a player's behalf.
    ///        Immutable: a compromised or replaced forwarder would be able to impersonate every player,
    ///        so swapping it means redeploying this contract.
    /// @dev `msg.sender` (not `_msgSender()`) is deliberate here — deployment is always a direct
    ///      transaction, and the forwarder immutable is not readable from within this constructor.
    constructor(address _usdt, uint96 _minWager, address _trustedForwarder)
        ERC2771Context(_trustedForwarder)
        Ownable(msg.sender)
    {
        require(_usdt != address(0), "Invalid USDT address");
        require(_minWager >= MIN_WAGER_FLOOR, "Invalid min wager");
        require(_trustedForwarder != address(0), "Invalid forwarder");
        usdt = IERC20(_usdt);
        minWager = _minWager;
    }

    // ─── Creating and joining ───

    /// @notice Create a new duel by depositing a USDT wager
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash Hash of the secret invite token required to accept or decline this duel.
    ///        Pass bytes32(0) for an open duel that anyone may join without a secret.
    /// @return duelId The unique identifier for the created duel
    function createDuel(uint256 amount, bytes32 inviteHash) external nonReentrant returns (uint256) {
        return _createDuel(amount, inviteHash, address(0), "");
    }

    /// @notice Create a new duel by depositing a USDT wager and attaching an optional short message
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash Hash of the secret invite token, or bytes32(0) for an open duel
    /// @param message Optional short duel message shown in the UI
    /// @return duelId The unique identifier for the created duel
    function createDuel(uint256 amount, bytes32 inviteHash, string calldata message) external nonReentrant returns (uint256) {
        return _createDuel(amount, inviteHash, address(0), message);
    }

    /// @notice Create a duel addressed to one specific player
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash Hash of the secret invite token, or bytes32(0) to rely on the address alone
    /// @param invitedOpponent The only address allowed to join or decline. address(0) leaves the
    ///        duel open to whoever satisfies `inviteHash`.
    /// @param message Optional short duel message shown in the UI. Pass "" for none.
    /// @return duelId The unique identifier for the created duel
    function createDuelFor(uint256 amount, bytes32 inviteHash, address invitedOpponent, string calldata message)
        external
        nonReentrant
        returns (uint256)
    {
        return _createDuel(amount, inviteHash, invitedOpponent, message);
    }

    /// @notice Create a new duel, authorising the wager transfer with an EIP-2612 permit signature
    ///         instead of a prior `approve` transaction
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash Hash of the secret invite token, or bytes32(0) for an open duel
    /// @param message Optional short duel message shown in the UI. Pass "" for none.
    /// @param permitDeadline Expiry timestamp of the permit signature
    /// @param v Permit signature component
    /// @param r Permit signature component
    /// @param s Permit signature component
    /// @return duelId The unique identifier for the created duel
    function createDuelWithPermit(
        uint256 amount,
        bytes32 inviteHash,
        string calldata message,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256) {
        _permit(_msgSender(), amount, permitDeadline, v, r, s);
        return _createDuel(amount, inviteHash, address(0), message);
    }

    /// @notice Create a duel addressed to one specific player, funded by an EIP-2612 permit signature
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash Hash of the secret invite token, or bytes32(0) to rely on the address alone
    /// @param invitedOpponent The only address allowed to join or decline, or address(0) for none
    /// @param message Optional short duel message shown in the UI. Pass "" for none.
    /// @param permitDeadline Expiry timestamp of the permit signature
    /// @param v Permit signature component
    /// @param r Permit signature component
    /// @param s Permit signature component
    /// @return duelId The unique identifier for the created duel
    function createDuelForWithPermit(
        uint256 amount,
        bytes32 inviteHash,
        address invitedOpponent,
        string calldata message,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256) {
        _permit(_msgSender(), amount, permitDeadline, v, r, s);
        return _createDuel(amount, inviteHash, invitedOpponent, message);
    }

    /// @dev `whenNotPaused` sits here, not on the five entry points that reach it, so that the
    ///      sixth cannot forget it. Both gates on entering a duel then read in one place, in one
    ///      order, and a forgotten modifier on an immutable contract fails silently — a duel
    ///      created during an emergency pause, with nothing to show for it afterwards. For the
    ///      permit variants this means the permit is consumed before the pause is checked; the
    ///      call reverts either way, so nothing is left behind.
    function _createDuel(uint256 amount, bytes32 inviteHash, address invitedOpponent, string memory message)
        internal
        whenNotPaused
        returns (uint256 duelId)
    {
        require(!duelCreationPaused, "Duel creation paused");
        require(amount >= minWager, "Wager below minimum");
        // Wagers live in a uint96 so they can share a slot with the creator. The ceiling is
        // 7.9e22 USDT — unreachable for the token, but checked rather than silently truncated.
        require(amount <= type(uint96).max, "Wager too large");
        _validateMessage(message);

        address creator = _msgSender();
        require(invitedOpponent != creator, "Cannot invite yourself");

        duelId = duelCount;
        duelCount++;

        Duel storage duel = duels[duelId];
        duel.creator = creator;
        duel.wagerAmount = uint96(amount);
        // Shares slot 1 with createdAt below, so writing address(0) here is free.
        duel.opponent = invitedOpponent;
        duel.createdAt = _now();
        duel.state = DuelState.Created;
        // An open duel and a duel with no message each leave a slot of their own untouched:
        // `duels[duelId]` is always a virgin entry, so skipping the zero write skips a cold slot.
        if (inviteHash != bytes32(0)) {
            duel.inviteHash = inviteHash;
        }
        if (bytes(message).length != 0) {
            duel.message = message;
        }
        // All other fields default to zero/false. `state` is not among them — the mapping's zero
        // value is `Nonexistent`, which is why it is written explicitly above.

        // Checks → effects → interactions: the duel is fully written before the token is touched.
        // `nonReentrant` already covers the re-entry this orders against, but the token is the one
        // external call here and the contract is immutable once deployed.
        _pullWager(creator, amount);

        emit DuelCreated(duelId, creator, invitedOpponent, amount, inviteHash, message);
    }

    /// @notice Join an existing duel by depositing the matching wager
    /// @param duelId The ID of the duel to join
    /// @param inviteSecret The secret invite token shared by the creator. Ignored for open duels.
    function joinDuel(uint256 duelId, bytes32 inviteSecret) external nonReentrant {
        _joinDuel(duelId, inviteSecret);
    }

    /// @notice Join an existing duel, authorising the wager transfer with an EIP-2612 permit
    ///         signature instead of a prior `approve` transaction
    /// @param duelId The ID of the duel to join
    /// @param inviteSecret The secret invite token shared by the creator. Ignored for open duels.
    /// @param permitDeadline Expiry timestamp of the permit signature
    /// @param v Permit signature component
    /// @param r Permit signature component
    /// @param s Permit signature component
    function joinDuelWithPermit(
        uint256 duelId,
        bytes32 inviteSecret,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // The permit is signed for exactly this duel's wager. A wrong duelId permits the
        // wrong amount, but _joinDuel then reverts and rolls the allowance back with it.
        _permit(_msgSender(), duels[duelId].wagerAmount, permitDeadline, v, r, s);
        _joinDuel(duelId, inviteSecret);
    }

    /// @dev `whenNotPaused` lives here rather than on the wrappers, as in `_createDuel`.
    function _joinDuel(uint256 duelId, bytes32 inviteSecret) internal whenNotPaused {
        Duel storage duel = _requireWaitingDuel(duelId);
        address opponent = _msgSender();
        require(opponent != duel.creator, "Cannot join own duel");

        _requireAdmitted(duel, opponent, inviteSecret);

        uint96 wager = duel.wagerAmount;

        duel.opponent = opponent;
        duel.fundedAt = _now();
        duel.state = DuelState.Funded;

        // Checks → effects → interactions, as in `_createDuel`.
        _pullWager(opponent, wager);

        emit DuelJoined(duelId, opponent, wager);
    }

    /// @notice Decline an invite-only duel before it is funded, refunding the creator.
    /// @dev Only a fully open duel — no secret and no named opponent — cannot be declined. Its
    ///      whole point is that any passer-by can join, which would equally let any passer-by
    ///      kill it: a free way to empty a public lobby, since declining costs nothing and ends
    ///      the duel for everyone. A duel addressed to one player is not open in that sense, so
    ///      its invitee may decline it whether or not it also carries a secret — the same pairing
    ///      of checks `joinDuel` applies.
    /// @param duelId The ID of the duel to decline
    /// @param inviteSecret The secret invite token shared by the creator. Ignored when the duel
    ///        carries no invite hash and is addressed to a specific opponent.
    function declineDuel(uint256 duelId, bytes32 inviteSecret) external whenNotPaused nonReentrant {
        Duel storage duel = _requireWaitingDuel(duelId);
        address decliner = _msgSender();
        require(decliner != duel.creator, "Creator cannot decline");

        require(
            duel.inviteHash != bytes32(0) || duel.opponent != address(0),
            "Open duel cannot be declined"
        );
        _requireAdmitted(duel, decliner, inviteSecret);

        duel.opponent = decliner;
        duel.finalizedAt = _now();
        duel.state = DuelState.Declined;

        emit DuelDeclined(duelId, decliner);
    }

    // ─── Playing it out ───

    /// @notice Claim victory in a funded duel. Starts the claimTimeout countdown for the opponent to confirm or dispute.
    /// @param duelId The ID of the duel
    function claimVictory(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Funded, "Duel not in Funded state");
        address claimer = _requireParticipant(duel);

        bool byCreator = claimer == duel.creator;
        duel.winnerIsCreator = byCreator;
        duel.claimedByCreator = byCreator;
        duel.claimTimestamp = _now();
        duel.state = DuelState.WinnerClaimed;

        emit VictoryClaimed(duelId, claimer, claimer);
    }

    /// @notice Admit defeat in a funded duel. Resolves it immediately in the other player's favour.
    /// @dev Unlike `claimVictory` this needs no confirmation window: a statement against your own
    ///      interest is not something the winner has any reason to dispute, and making them
    ///      confirm it cost a second relayed transaction and created a perverse branch — if the
    ///      winner stayed silent the claim timed out into a refund, handing the player who
    ///      admitted defeat their wager back plus an `honored` count, and the winner an
    ///      `abandoned` one.
    /// @param duelId The ID of the duel
    function admitDefeat(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Funded, "Duel not in Funded state");
        address loser = _requireParticipant(duel);

        bool winnerIsCreator = loser == duel.opponent;
        address winner = winnerIsCreator ? duel.creator : duel.opponent;

        uint40 timestamp = _now();
        duel.winnerIsCreator = winnerIsCreator;
        duel.claimedByCreator = !winnerIsCreator;
        duel.claimTimestamp = timestamp;
        duel.finalizedAt = timestamp;
        duel.state = DuelState.Resolved;

        _recordResolution(duel);

        uint256 payout = _payoutOf(duel, winnerIsCreator);
        emit VictoryClaimed(duelId, loser, winner);
        emit DuelResolved(duelId, winner, payout);
    }

    /// @notice Request cancellation of a funded duel by mutual agreement.
    /// @dev Callable while paused: this is how two players walk away from a duel the pause froze.
    /// @param duelId The ID of the duel
    function requestMutualCancellation(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Funded, "Duel not in Funded state");
        address requester = _requireParticipant(duel);

        duel.cancelRequestedByCreator = requester == duel.creator;
        duel.cancelRequestedAt = _now();
        duel.state = DuelState.MutualCancelRequested;

        emit DuelMutualCancellationRequested(duelId, requester);
    }

    /// @notice Accept a pending mutual cancellation request and unlock full refunds for both players.
    /// @dev Callable while paused — it only returns each player their own wager.
    /// @param duelId The ID of the duel
    function acceptMutualCancellation(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.MutualCancelRequested, "Duel not in MutualCancelRequested state");
        address accepter = _requireParticipant(duel);
        address requester = _cancelRequestedBy(duel);
        require(accepter != requester, "Requester cannot accept");

        duel.finalizedAt = _now();
        duel.state = DuelState.MutuallyCancelled;

        emit DuelMutuallyCancelled(duelId, requester, accepter);
    }

    /// @notice Decline a pending mutual cancellation request and resume the duel.
    /// @param duelId The ID of the duel
    function declineMutualCancellation(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.MutualCancelRequested, "Duel not in MutualCancelRequested state");
        address decliner = _requireParticipant(duel);
        require(decliner != _cancelRequestedBy(duel), "Requester cannot decline");

        _clearMutualCancellationRequest(duel);
        duel.state = DuelState.Funded;

        emit DuelMutualCancellationDeclined(duelId, decliner);
    }

    /// @notice Withdraw your own pending mutual cancellation request and resume the duel.
    /// @param duelId The ID of the duel
    function withdrawMutualCancellationRequest(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        address requester = _msgSender();
        require(duel.state == DuelState.MutualCancelRequested, "Duel not in MutualCancelRequested state");
        require(requester == _cancelRequestedBy(duel), "Only requester can withdraw");

        _clearMutualCancellationRequest(duel);
        duel.state = DuelState.Funded;

        emit DuelMutualCancellationWithdrawn(duelId, requester);
    }

    /// @notice Confirm the claimed result. Must be called by the OTHER player (not the one who called claimVictory).
    /// @param duelId The ID of the duel
    /// @dev Not pausable, for the same reason `refund` is not: it only distributes the two wagers
    ///      the contract already holds. Were it pausable, a pause over a claim window would let
    ///      the timeout run out, turning a win into a refund and stamping the player who was
    ///      prevented from confirming as the one who abandoned the duel.
    function confirmResult(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.WinnerClaimed, "Duel not in WinnerClaimed state");
        address confirmer = _requireParticipant(duel);
        require(confirmer != _claimedBy(duel), "Cannot confirm own claim");

        duel.finalizedAt = _now();
        duel.state = DuelState.Resolved;

        _recordResolution(duel);

        emit DuelResolved(duelId, _claimedWinner(duel), _payoutOf(duel, duel.winnerIsCreator));
    }

    /// @notice Dispute a claimed result. Unlocks full refunds for both players with no reputation changes.
    /// @param duelId The ID of the duel
    /// @dev Not pausable — same reasoning as `confirmResult`.
    function disputeResult(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.WinnerClaimed, "Duel not in WinnerClaimed state");
        address disputer = _requireParticipant(duel);
        require(disputer != _claimedBy(duel), "Cannot dispute own claim");

        duel.finalizedAt = _now();
        duel.state = DuelState.Disputed;

        emit DuelDisputed(duelId, disputer);
    }

    /// @notice Refund both players if the claim times out without confirmation.
    ///         Anyone can call this after the timeout period.
    /// @dev Callable while paused: a pause must not be able to hold a timed-out duel hostage.
    /// @param duelId The ID of the duel
    function refund(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.WinnerClaimed, "Duel not in WinnerClaimed state");
        require(
            block.timestamp >= uint256(duel.claimTimestamp) + claimTimeout,
            "Claim timeout not reached"
        );

        _refundTimedOutDuel(duel);

        emit DuelRefunded(duelId);
    }

    /// @notice Cancel an unfunded duel and refund the creator
    /// @dev Callable while paused — the creator is only taking back their own, unmatched stake.
    /// @param duelId The ID of the duel
    function cancelDuel(uint256 duelId) external nonReentrant {
        Duel storage duel = _requireWaitingDuel(duelId);
        require(_msgSender() == duel.creator, "Only creator can cancel");

        duel.finalizedAt = _now();
        duel.state = DuelState.Cancelled;

        emit DuelCancelled(duelId);
    }

    // ─── Payouts ───
    //
    // None of the claim entry points is pausable. `pause()` exists to stop the contract taking
    // new money and to stop new results being declared; money a player has already won, or that
    // a refund already released, is theirs, and an emergency brake that can hold it indefinitely
    // is indistinguishable from a freeze on user funds.

    /// @notice Claim the payout or refund assigned to the caller for a specific duel
    /// @param duelId The ID of the duel to claim from
    function claimPayout(uint256 duelId) external nonReentrant {
        _claimPayout(duelId, _msgSender());
    }

    /// @notice Claim the caller's payout for a duel and send it to another address
    /// @dev The destination matters in practice: USDT can blacklist an address, which would
    ///      otherwise strand a winner's payout in the contract forever, and players routinely
    ///      want winnings in a wallet other than the hot one they play from.
    /// @param duelId The ID of the duel to claim from
    /// @param to Recipient of the funds
    function claimPayoutTo(uint256 duelId, address to) external nonReentrant {
        _requireValidRecipient(to);
        _claimPayout(duelId, to);
    }

    function _claimPayout(uint256 duelId, address to) internal {
        Duel storage duel = duels[duelId];
        address claimant = _requireParticipant(duel);

        uint256 amount = _claimSinglePayout(duel, duelId, claimant, to);
        require(amount > 0, "Nothing to claim");

        usdt.safeTransfer(to, amount);
    }

    /// @notice Claim any available payouts for the caller across the supplied duels
    /// @param duelIds The duel IDs to attempt to claim from
    function claimPayouts(uint256[] calldata duelIds) external nonReentrant {
        _claimPayouts(duelIds, _msgSender());
    }

    /// @notice Claim available payouts across the supplied duels and send them to another address
    /// @param duelIds The duel IDs to attempt to claim from
    /// @param to Recipient of the funds
    function claimPayoutsTo(uint256[] calldata duelIds, address to) external nonReentrant {
        _requireValidRecipient(to);
        _claimPayouts(duelIds, to);
    }

    function _claimPayouts(uint256[] calldata duelIds, address to) internal {
        address claimant = _msgSender();
        uint256 totalAmount;

        for (uint256 i = 0; i < duelIds.length; i++) {
            totalAmount += _claimSinglePayout(duels[duelIds[i]], duelIds[i], claimant, to);
        }

        require(totalAmount > 0, "Nothing to claim");

        usdt.safeTransfer(to, totalAmount);
    }

    /// @notice Refund all timed-out duels and claim the caller's payouts in one transaction.
    ///         Duels that are not in WinnerClaimed state or have not timed out are silently skipped.
    /// @param duelIds The duel IDs to refund and claim from
    function refundAndClaimPayouts(uint256[] calldata duelIds) external nonReentrant {
        _refundAndClaimPayouts(duelIds, _msgSender());
    }

    /// @notice Refund all timed-out duels, claim the caller's payouts and send them to another address
    /// @param duelIds The duel IDs to refund and claim from
    /// @param to Recipient of the funds
    function refundAndClaimPayoutsTo(uint256[] calldata duelIds, address to) external nonReentrant {
        _requireValidRecipient(to);
        _refundAndClaimPayouts(duelIds, to);
    }

    function _refundAndClaimPayouts(uint256[] calldata duelIds, address to) internal {
        uint256 timeout = claimTimeout;
        address claimant = _msgSender();
        uint256 totalAmount;

        // Refunding a duel is what makes its payout claimable, so both happen in one pass: the
        // duel is already loaded, and a second walk over the same calldata buys nothing.
        for (uint256 i = 0; i < duelIds.length; i++) {
            uint256 duelId = duelIds[i];
            Duel storage duel = duels[duelId];

            if (duel.state == DuelState.WinnerClaimed && block.timestamp >= uint256(duel.claimTimestamp) + timeout) {
                _refundTimedOutDuel(duel);
                emit DuelRefunded(duelId);
            }

            totalAmount += _claimSinglePayout(duel, duelId, claimant, to);
        }

        require(totalAmount > 0, "Nothing to claim");
        usdt.safeTransfer(to, totalAmount);
    }

    // ─── Owner rescue paths ───

    /// @notice Rescue any ERC20 token accidentally sent to this contract (except USDT)
    /// @param token The ERC20 token to rescue
    /// @param to The recipient address
    /// @param amount The amount to transfer
    function rescueToken(IERC20 token, address to, uint256 amount) external onlyOwner {
        require(address(token) != address(usdt), "Cannot rescue USDT");
        _requireValidRecipient(to);
        token.safeTransfer(to, amount);
    }

    /// @notice Rescue ETH accidentally sent to this contract
    /// @param to The recipient address
    function rescueETH(address payable to) external onlyOwner {
        _requireValidRecipient(to);
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to rescue");
        (bool success,) = to.call{value: balance}("");
        require(success, "ETH transfer failed");
    }

    // ─── Emergency token rescue (timelocked) ───

    /// @notice Request emergency withdrawal of any ERC20 token. Starts the emergencyDelay countdown.
    /// @param token The ERC20 token address to withdraw
    /// @param recipient The address that will receive the funds
    /// @param amount The amount to withdraw
    /// @return requestId The unique ID of this emergency request
    function requestEmergencyWithdraw(address token, address recipient, uint256 amount) external onlyOwner returns (uint256) {
        require(token != address(0), "Invalid token");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        uint256 requestId = emergencyNonce++;
        emergencyRequests[requestId] = EmergencyRequest({
            token: token,
            recipient: recipient,
            amount: amount,
            requestedAt: block.timestamp
        });

        emit EmergencyRequested(requestId, token, recipient, amount, block.timestamp + emergencyDelay);
        return requestId;
    }

    /// @notice Cancel a pending emergency withdrawal
    /// @param requestId The ID of the request to cancel
    function cancelEmergencyWithdraw(uint256 requestId) external onlyOwner {
        require(emergencyRequests[requestId].requestedAt > 0, "Request not found");
        delete emergencyRequests[requestId];
        emit EmergencyCancelled(requestId);
    }

    /// @notice Execute emergency withdrawal after the emergencyDelay timelock
    /// @param requestId The ID of the request to execute
    function executeEmergencyWithdraw(uint256 requestId) external onlyOwner {
        EmergencyRequest memory req = emergencyRequests[requestId];
        require(req.requestedAt > 0, "Request not found");
        require(
            block.timestamp >= req.requestedAt + emergencyDelay,
            "Timelock not expired"
        );

        delete emergencyRequests[requestId];
        IERC20(req.token).safeTransfer(req.recipient, req.amount);
        emit EmergencyExecuted(requestId, req.token, req.recipient, req.amount);
    }

    // ─── Admin ───

    /// @notice Set the minimum wager for new duels (owner only)
    /// @param newMinWager New minimum in USDT (6 decimals), at least MIN_WAGER_FLOOR
    function setMinWager(uint96 newMinWager) external onlyOwner {
        require(newMinWager >= MIN_WAGER_FLOOR, "Below minimum");
        emit MinWagerUpdated(minWager, newMinWager);
        minWager = newMinWager;
    }

    /// @notice Set the confirm/dispute window after a victory claim (owner only)
    /// @dev Also applies to in-flight WinnerClaimed duels: a raised value extends
    ///      their window, a lowered one shortens it (never below MIN_CLAIM_TIMEOUT)
    /// @param newClaimTimeout New window in seconds, at least MIN_CLAIM_TIMEOUT
    function setClaimTimeout(uint64 newClaimTimeout) external onlyOwner {
        require(newClaimTimeout >= MIN_CLAIM_TIMEOUT, "Below minimum");
        emit ClaimTimeoutUpdated(claimTimeout, newClaimTimeout);
        claimTimeout = newClaimTimeout;
    }

    /// @notice Set the emergency withdrawal timelock (owner only)
    /// @dev Also applies to already-pending emergency requests
    /// @param newEmergencyDelay New delay in seconds, at least MIN_EMERGENCY_DELAY
    function setEmergencyDelay(uint64 newEmergencyDelay) external onlyOwner {
        require(newEmergencyDelay >= MIN_EMERGENCY_DELAY, "Below minimum");
        emit EmergencyDelayUpdated(emergencyDelay, newEmergencyDelay);
        emergencyDelay = newEmergencyDelay;
    }

    /// @notice Set the maximum duel message length in code points (owner only)
    /// @param newMax New limit, at least MIN_MESSAGE_CODEPOINTS
    function setMaxMessageCodepoints(uint16 newMax) external onlyOwner {
        require(newMax >= MIN_MESSAGE_CODEPOINTS, "Below minimum");
        emit MaxMessageCodepointsUpdated(maxMessageCodepoints, newMax);
        maxMessageCodepoints = newMax;
    }

    /// @notice Set the maximum duel message length in UTF-8 bytes (owner only)
    /// @param newMax New limit, at least MIN_MESSAGE_BYTES
    function setMaxMessageBytes(uint16 newMax) external onlyOwner {
        require(newMax >= MIN_MESSAGE_BYTES, "Below minimum");
        emit MaxMessageBytesUpdated(maxMessageBytes, newMax);
        maxMessageBytes = newMax;
    }

    /// @notice Stop or resume the creation of new duels (owner only)
    /// @dev Existing duels keep playing out and payouts keep flowing — see `duelCreationPaused`.
    /// @param paused True to block createDuel*, false to allow it again
    function setDuelCreationPaused(bool paused) external onlyOwner {
        duelCreationPaused = paused;
        emit DuelCreationPausedUpdated(paused);
    }

    /// @notice Pause duel operations (owner only). Payouts, refunds, cancellations stay open.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause duel operations (owner only)
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Views ───

    /// @notice Get full duel info
    /// @param duelId The ID of the duel
    /// @return The duel in its flat, client-facing shape
    function getDuel(uint256 duelId) external view returns (DuelView memory) {
        return _duelView(duelId);
    }

    /// @notice Read a window of duels by id, oldest id first
    /// @dev Listing screens used to fetch every duel that ever existed on each refresh. This
    ///      keeps that one call, but bounded: ask for the window you are about to render.
    /// @param offset First duel id to read
    /// @param limit Maximum number of duels to return
    /// @return page The duels in [offset, min(offset + limit, duelCount))
    function getDuels(uint256 offset, uint256 limit) external view returns (DuelView[] memory page) {
        uint256 total = duelCount;
        if (offset >= total || limit == 0) {
            return new DuelView[](0);
        }

        // Clamped as a length, never as an end index: `offset + limit` overflows for a caller
        // that asks for "everything from here" with type(uint256).max, and an arithmetic panic
        // is a poor answer from a bounded reader.
        uint256 remaining = total - offset;
        uint256 size = limit < remaining ? limit : remaining;

        page = new DuelView[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = _duelView(offset + i);
        }
    }

    /// @notice Read an arbitrary set of duels in one call
    /// @param duelIds The duel ids to read
    /// @return result One entry per requested id, in the same order
    function getDuelsByIds(uint256[] calldata duelIds) external view returns (DuelView[] memory result) {
        result = new DuelView[](duelIds.length);
        for (uint256 i = 0; i < duelIds.length; i++) {
            result[i] = _duelView(duelIds[i]);
        }
    }

    /// @notice Get a user's on-chain reputation and activity record
    /// @param user The address to query
    /// @return The player's counters
    function getPlayerStats(address user) external view returns (PlayerStats memory) {
        return playerStats[user];
    }

    // ─── ERC-2771 context resolution ───
    // DuelMe reaches Context through both Ownable/Pausable and ERC2771Context, so Solidity
    // makes the derived contract pick a winner explicitly. ERC2771Context wins: it returns
    // the forwarder-supplied signer for relayed calls and plain msg.sender otherwise.

    function _msgSender() internal view virtual override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view virtual override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    /// @dev Administrative authority is deliberately NOT relayable. Ownable checks the caller
    ///      through _msgSender(), which the override above resolves from the forwarder-supplied
    ///      suffix — that would let a single off-chain signature from the owner key move
    ///      ownership, pause every duel or start an emergency withdrawal, with the attacker
    ///      paying the gas and submitting it whenever they like. The forwarder is there so
    ///      players need no ETH; the owner has ETH. Pinning this one check back to msg.sender
    ///      covers every onlyOwner entry point plus inherited transferOwnership /
    ///      renounceOwnership in one place, and leaves player paths relayed.
    function _checkOwner() internal view virtual override {
        if (owner() != msg.sender) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
    }

    /// @dev The other half of the rule above: Ownable2Step checks the incoming owner with
    ///      _msgSender(), so without this override a relayed signature could complete a
    ///      handover. Accepting ownership is an administrative act — it needs a real
    ///      transaction from the incoming owner's own key.
    function acceptOwnership() public virtual override {
        address sender = msg.sender;
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }

    // ─── Internals ───

    /// @dev Grants this contract an EIP-2612 allowance of `amount` from `owner`.
    ///      The signature is public the moment the relayer's transaction reaches the mempool,
    ///      so anyone can replay it straight onto the token first. That front-run burns the
    ///      token nonce and makes our own `permit` revert — while leaving behind exactly the
    ///      allowance we asked for. Swallowing the revert turns that griefing vector into a
    ///      no-op; the allowance check in the catch branch keeps a genuinely bad signature
    ///      failing loudly instead of falling through to an opaque transferFrom revert.
    function _permit(address owner, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) internal {
        try IERC20Permit(address(usdt)).permit(owner, address(this), amount, deadline, v, r, s) {
            return;
        } catch {
            require(usdt.allowance(owner, address(this)) >= amount, "Permit failed");
        }
    }

    /// @dev Takes a wager and verifies the contract actually received all of it. USDT's own
    ///      implementation carries a transfer-fee switch; if it were ever turned on, crediting
    ///      the requested amount while holding less would quietly under-collateralise every
    ///      duel and leave the last claimants unable to withdraw. Refusing the duel is the
    ///      honest failure mode.
    function _pullWager(address payer, uint256 amount) internal {
        IERC20 token = usdt;
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(payer, address(this), amount);
        require(token.balanceOf(address(this)) - balanceBefore == amount, "Token fee on transfer");
    }

    /// @notice Hash an invite secret the way this contract expects it in `createDuel`.
    /// @dev Binds the secret to this contract and chain, so one leaked or reused invite cannot be
    ///      replayed against a duel on another deployment. Public so clients and tests can read
    ///      the formula off the contract instead of reimplementing it — a mismatch would surface
    ///      only as `"Invalid invite"`, with the duel joinable by nobody.
    /// @param inviteSecret The secret to hash
    /// @return The value to pass as `inviteHash`
    function hashInviteSecret(bytes32 inviteSecret) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, inviteSecret));
    }

    /// @dev Loads a duel that is still waiting for an opponent — the shared preamble of the three
    ///      entry points whose required state is `Created`. With `Nonexistent` holding the zero
    ///      value, this one check answers both "no such duel" and "this duel has moved on", and a
    ///      never-issued id can no longer be mistaken for an open one.
    function _requireWaitingDuel(uint256 duelId) internal view returns (Duel storage duel) {
        duel = duels[duelId];
        require(duel.state == DuelState.Created, "Duel not in Created state");
    }

    function _now() internal view returns (uint40) {
        return uint40(block.timestamp);
    }

    /// @dev The states in which a result has been declared, so `claimedWinner` / `claimedBy`
    ///      name somebody. Gated on state rather than on a timestamp being non-zero: state is what
    ///      `_payoutOf` reads, and a sentinel only stays true while every writer remembers to
    ///      maintain it.
    function _hasDeclaredResult(DuelState state) internal pure returns (bool) {
        return state == DuelState.WinnerClaimed || state == DuelState.Resolved
            || state == DuelState.Refunded || state == DuelState.Disputed;
    }

    function _claimedWinner(Duel storage duel) internal view returns (address) {
        if (!_hasDeclaredResult(duel.state)) {
            return address(0);
        }
        return duel.winnerIsCreator ? duel.creator : duel.opponent;
    }

    function _claimedBy(Duel storage duel) internal view returns (address) {
        if (!_hasDeclaredResult(duel.state)) {
            return address(0);
        }
        return duel.claimedByCreator ? duel.creator : duel.opponent;
    }

    function _cancelRequestedBy(Duel storage duel) internal view returns (address) {
        DuelState state = duel.state;
        if (state != DuelState.MutualCancelRequested && state != DuelState.MutuallyCancelled) {
            return address(0);
        }
        return duel.cancelRequestedByCreator ? duel.creator : duel.opponent;
    }

    /// @dev A payout destination that is neither nowhere nor back into escrow: USDT sent to this
    ///      contract is indistinguishable from a wager, `rescueToken` refuses to move it, and only
    ///      the 30-day emergency timelock could return it.
    function _requireValidRecipient(address to) internal view {
        require(to != address(0) && to != address(this), "Invalid recipient");
    }

    /// @dev The caller, once it is established they are in this duel. Eight entry points asked
    ///      the same question of the same two fields; asking it in one place is what stops the
    ///      ninth from forgetting.
    function _requireParticipant(Duel storage duel) internal view returns (address caller) {
        caller = _msgSender();
        require(caller == duel.creator || caller == duel.opponent, "Not a participant");
    }

    /// @dev The admission rule for a duel still in `Created`: an address-bound duel admits only
    ///      the player it names, and a secret-gated duel admits only a caller who can present the
    ///      secret. Shared by join and decline so the two can never drift on who may act.
    function _requireAdmitted(Duel storage duel, address caller, bytes32 inviteSecret) internal view {
        address invited = duel.opponent;
        require(invited == address(0) || invited == caller, "Not the invited opponent");

        bytes32 inviteHash = duel.inviteHash;
        if (inviteHash != bytes32(0)) {
            require(hashInviteSecret(inviteSecret) == inviteHash, "Invalid invite");
        }
    }

    /// @dev What each side may withdraw, derived rather than stored. Every terminal state pays
    ///      out of the two wagers the contract is holding for this duel and nothing else:
    ///      the winner takes both, a refund returns one each, and a duel that never got funded
    ///      gives the creator theirs back.
    function _payoutOf(Duel storage duel, bool creatorSide) internal view returns (uint256) {
        return _payoutFrom(duel.state, duel.wagerAmount, duel.winnerIsCreator, creatorSide);
    }

    /// @dev The rule itself, over fields the caller already has. `_duelView` reads all three once
    ///      and asks for both sides; everyone else goes through `_payoutOf` above. Splitting it
    ///      this way keeps one payout rule — a second copy is the way a duel's state and its
    ///      payout learn to disagree.
    function _payoutFrom(DuelState state, uint256 wager, bool winnerIsCreator, bool creatorSide)
        internal
        pure
        returns (uint256)
    {
        if (state == DuelState.Resolved) {
            return winnerIsCreator == creatorSide ? wager * 2 : 0;
        }
        if (state == DuelState.Refunded || state == DuelState.Disputed || state == DuelState.MutuallyCancelled) {
            return wager;
        }
        if (state == DuelState.Cancelled || state == DuelState.Declined) {
            return creatorSide ? wager : 0;
        }
        // Created, Funded, WinnerClaimed, MutualCancelRequested — nothing unlocked yet.
        return 0;
    }

    /// @dev Credits both players for a duel that reached a confirmed result.
    function _recordResolution(Duel storage duel) internal {
        uint96 wager = duel.wagerAmount;
        bool winnerIsCreator = duel.winnerIsCreator;
        address winner = winnerIsCreator ? duel.creator : duel.opponent;
        address loser = winnerIsCreator ? duel.opponent : duel.creator;

        PlayerStats storage winnerStats = playerStats[winner];
        winnerStats.duelsHonored += 1;
        winnerStats.duelsWon += 1;
        winnerStats.volume += wager;

        PlayerStats storage loserStats = playerStats[loser];
        loserStats.duelsHonored += 1;
        loserStats.duelsLost += 1;
        loserStats.volume += wager;
    }

    /// @dev Shared by `refund` and `refundAndClaimPayouts`: moves a timed-out claim to Refunded
    ///      and records who stood by their claim and who never answered.
    function _refundTimedOutDuel(Duel storage duel) internal {
        duel.finalizedAt = _now();
        duel.state = DuelState.Refunded;

        uint96 wager = duel.wagerAmount;
        bool claimedByCreator = duel.claimedByCreator;
        address claimer = claimedByCreator ? duel.creator : duel.opponent;
        address nonResponder = claimedByCreator ? duel.opponent : duel.creator;

        // The player who made the claim behaved correctly
        PlayerStats storage claimerStats = playerStats[claimer];
        claimerStats.duelsHonored += 1;
        claimerStats.volume += wager;

        // The non-responding player abandoned the duel
        PlayerStats storage nonResponderStats = playerStats[nonResponder];
        nonResponderStats.duelsAbandoned += 1;
        nonResponderStats.volume += wager;
    }

    function _validateMessage(string memory message) internal view {
        bytes memory data = bytes(message);
        uint256 byteLength = data.length;
        if (byteLength == 0) {
            return;
        }
        require(byteLength <= maxMessageBytes, "Message too long");

        uint256 maxCodePoints = maxMessageCodepoints;
        uint256 i;
        uint256 codePoints;

        while (i < byteLength) {
            uint8 leading = uint8(data[i]);
            uint256 sequenceLength;

            if (leading < 0x80) {
                sequenceLength = 1;
            } else if (leading < 0xC2) {
                revert("Invalid UTF-8");
            } else if (leading < 0xE0) {
                sequenceLength = 2;
            } else if (leading < 0xF0) {
                sequenceLength = 3;
            } else if (leading < 0xF5) {
                sequenceLength = 4;
            } else {
                revert("Invalid UTF-8");
            }

            require(i + sequenceLength <= byteLength, "Invalid UTF-8");

            if (sequenceLength > 1) {
                uint8 b1 = uint8(data[i + 1]);
                require((b1 & 0xC0) == 0x80, "Invalid UTF-8");

                if (sequenceLength == 2) {
                    // No additional checks required beyond the leading-byte guard above.
                } else if (sequenceLength == 3) {
                    uint8 b2 = uint8(data[i + 2]);
                    require((b2 & 0xC0) == 0x80, "Invalid UTF-8");

                    if (leading == 0xE0) {
                        require(b1 >= 0xA0, "Invalid UTF-8");
                    } else if (leading == 0xED) {
                        require(b1 < 0xA0, "Invalid UTF-8");
                    }
                } else {
                    uint8 b2 = uint8(data[i + 2]);
                    uint8 b3 = uint8(data[i + 3]);
                    require((b2 & 0xC0) == 0x80, "Invalid UTF-8");
                    require((b3 & 0xC0) == 0x80, "Invalid UTF-8");

                    if (leading == 0xF0) {
                        require(b1 >= 0x90, "Invalid UTF-8");
                    } else if (leading == 0xF4) {
                        require(b1 < 0x90, "Invalid UTF-8");
                    }
                }
            }

            codePoints++;
            require(codePoints <= maxCodePoints, "Message too long");
            i += sequenceLength;
        }
    }

    function _clearMutualCancellationRequest(Duel storage duel) internal {
        duel.cancelRequestedByCreator = false;
        duel.cancelRequestedAt = 0;
    }

    function _claimSinglePayout(Duel storage duel, uint256 duelId, address player, address to) internal returns (uint256 amount) {
        bool creatorSide;

        if (player == duel.creator) {
            if (duel.creatorClaimed) {
                return 0;
            }
            creatorSide = true;
        } else if (player == duel.opponent) {
            if (duel.opponentClaimed) {
                return 0;
            }
        } else {
            return 0;
        }

        amount = _payoutOf(duel, creatorSide);
        if (amount == 0) {
            return 0;
        }

        if (creatorSide) {
            duel.creatorClaimed = true;
        } else {
            duel.opponentClaimed = true;
        }

        emit DuelPayoutClaimed(duelId, player, to, amount);
    }

    function _duelView(uint256 duelId) internal view returns (DuelView memory result) {
        Duel storage duel = duels[duelId];

        // Every field is read from storage exactly once here. The three `_…By` helpers and
        // `_payoutOf` each re-read `state`, `creator`, `opponent` and `wagerAmount`, which is
        // right for a one-off call and wasteful 200 times over inside `getDuels` — and it is the
        // size of a page that this call's cost decides. The rules themselves are still the shared
        // ones (`_hasDeclaredResult`, `_payoutFrom`); only the loads moved.
        DuelState state = duel.state;
        address creator = duel.creator;
        address opponent = duel.opponent;
        uint96 wagerAmount = duel.wagerAmount;
        bool winnerIsCreator = duel.winnerIsCreator;
        bool hasDeclaredResult = _hasDeclaredResult(state);

        // Until someone joins or declines, the opponent slot holds the invited address rather
        // than a second player — including for a duel the creator cancelled while it was still
        // waiting. External readers have always been able to treat a non-zero `opponent` as
        // "this duel has two players", so the invitee is reported in its own field.
        bool hasSecondPlayer = state != DuelState.Created && state != DuelState.Cancelled;

        result.creator = creator;
        result.opponent = hasSecondPlayer ? opponent : address(0);
        result.invitedOpponent = hasSecondPlayer ? address(0) : opponent;
        result.wagerAmount = wagerAmount;
        result.inviteHash = duel.inviteHash;
        result.message = duel.message;
        result.claimedWinner = hasDeclaredResult ? (winnerIsCreator ? creator : opponent) : address(0);
        result.claimedBy = hasDeclaredResult ? (duel.claimedByCreator ? creator : opponent) : address(0);
        result.cancelRequestedBy =
            (state == DuelState.MutualCancelRequested || state == DuelState.MutuallyCancelled)
                ? (duel.cancelRequestedByCreator ? creator : opponent)
                : address(0);
        result.createdAt = duel.createdAt;
        result.fundedAt = duel.fundedAt;
        result.cancelRequestedAt = duel.cancelRequestedAt;
        result.claimTimestamp = duel.claimTimestamp;
        result.finalizedAt = duel.finalizedAt;
        result.creatorPayout = _payoutFrom(state, wagerAmount, winnerIsCreator, true);
        result.opponentPayout = _payoutFrom(state, wagerAmount, winnerIsCreator, false);
        result.creatorClaimed = duel.creatorClaimed;
        result.opponentClaimed = duel.opponentClaimed;
        result.state = state;
    }
}
