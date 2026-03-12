// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title DuelMe - A Web3 Gaming Duel Platform
/// @notice Allows two players to wager USDT on a duel with on-chain reputation tracking
/// @dev Uses OpenZeppelin SafeERC20, ReentrancyGuard, Pausable, and Ownable
contract DuelMe is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;

    uint256 public constant MIN_WAGER = 3_000_000; // 3 USDT (6 decimals)
    uint256 public constant CLAIM_TIMEOUT = 3600; // 1 hour
    uint256 public constant EMERGENCY_DELAY = 30 days;
    uint256 public constant MAX_MESSAGE_CODEPOINTS = 32;
    uint256 public constant MAX_MESSAGE_BYTES = 128;

    uint256 public duelCount;

    struct EmergencyRequest {
        address token;
        address recipient;
        uint256 amount;
        uint256 requestedAt;
    }

    /// @notice Pending emergency withdrawal requests, keyed by a unique nonce
    mapping(uint256 => EmergencyRequest) public emergencyRequests;
    uint256 public emergencyNonce;

    enum DuelState {
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

    struct Duel {
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
    }

    struct PlayerStats {
        uint32 duelsHonored;   // resolved normally (both confirmed)
        uint32 duelsAbandoned; // this player was the non-responder in a refund
    }

    mapping(uint256 => Duel) private duels;
    mapping(address => PlayerStats) public playerStats;

    event DuelCreated(uint256 indexed duelId, address indexed creator, uint256 wagerAmount);
    event DuelJoined(uint256 indexed duelId, address indexed opponent);
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
    event DuelPayoutClaimed(uint256 indexed duelId, address indexed player, uint256 amount);
    event EmergencyRequested(uint256 indexed requestId, address indexed token, address indexed recipient, uint256 amount, uint256 executeAfter);
    event EmergencyCancelled(uint256 indexed requestId);
    event EmergencyExecuted(uint256 indexed requestId, address indexed token, address indexed recipient, uint256 amount);

    constructor(address _usdt) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        usdt = IERC20(_usdt);
    }

    /// @notice Create a new duel by depositing a USDT wager
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash The hash of the secret invite token required to accept or decline this duel
    /// @return duelId The unique identifier for the created duel
    function createDuel(uint256 amount, bytes32 inviteHash) external whenNotPaused nonReentrant returns (uint256) {
        return _createDuel(amount, inviteHash, "");
    }

    /// @notice Create a new duel by depositing a USDT wager and attaching an optional short message
    /// @param amount The wager amount in USDT (6 decimals)
    /// @param inviteHash The hash of the secret invite token required to accept or decline this duel
    /// @param message Optional short duel message shown in the UI
    /// @return duelId The unique identifier for the created duel
    function createDuel(uint256 amount, bytes32 inviteHash, string calldata message) external whenNotPaused nonReentrant returns (uint256) {
        return _createDuel(amount, inviteHash, message);
    }

    function _createDuel(uint256 amount, bytes32 inviteHash, string memory message) internal returns (uint256 duelId) {
        require(amount >= MIN_WAGER, "Wager below minimum");
        require(inviteHash != bytes32(0), "Invalid invite hash");
        _validateMessage(message);

        usdt.safeTransferFrom(msg.sender, address(this), amount);

        duelId = duelCount;
        duelCount++;

        Duel storage duel = duels[duelId];
        duel.creator = msg.sender;
        duel.opponent = address(0);
        duel.wagerAmount = amount;
        duel.inviteHash = inviteHash;
        duel.message = message;
        duel.claimedWinner = address(0);
        duel.claimedBy = address(0);
        duel.cancelRequestedBy = address(0);
        duel.createdAt = block.timestamp;
        duel.fundedAt = 0;
        duel.cancelRequestedAt = 0;
        duel.claimTimestamp = 0;
        duel.finalizedAt = 0;
        duel.creatorPayout = 0;
        duel.opponentPayout = 0;
        duel.creatorClaimed = false;
        duel.opponentClaimed = false;
        duel.state = DuelState.Created;

        emit DuelCreated(duelId, msg.sender, amount);
    }

    /// @notice Join an existing duel by depositing the matching wager
    /// @param duelId The ID of the duel to join
    /// @param inviteSecret The secret invite token shared by the creator
    function joinDuel(uint256 duelId, bytes32 inviteSecret) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Created, "Duel not in Created state");
        require(msg.sender != duel.creator, "Cannot join own duel");
        require(_hashInviteSecret(inviteSecret) == duel.inviteHash, "Invalid invite");

        usdt.safeTransferFrom(msg.sender, address(this), duel.wagerAmount);

        duel.opponent = msg.sender;
        duel.fundedAt = block.timestamp;
        duel.state = DuelState.Funded;

        emit DuelJoined(duelId, msg.sender);
    }

    /// @notice Decline an invite-only duel before it is funded, refunding the creator.
    /// @param duelId The ID of the duel to decline
    /// @param inviteSecret The secret invite token shared by the creator
    function declineDuel(uint256 duelId, bytes32 inviteSecret) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Created, "Duel not in Created state");
        require(msg.sender != duel.creator, "Creator cannot decline");
        require(_hashInviteSecret(inviteSecret) == duel.inviteHash, "Invalid invite");

        duel.opponent = msg.sender;
        duel.finalizedAt = block.timestamp;
        duel.state = DuelState.Declined;
        _setPayouts(duel, duel.wagerAmount, 0);

        emit DuelDeclined(duelId, msg.sender);
    }

    /// @notice Claim victory in a funded duel. Starts a 1-hour countdown for the opponent to confirm or dispute.
    /// @param duelId The ID of the duel
    function claimVictory(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Funded, "Duel not in Funded state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );

        duel.claimedWinner = msg.sender;
        duel.claimedBy = msg.sender;
        duel.claimTimestamp = block.timestamp;
        duel.state = DuelState.WinnerClaimed;

        emit VictoryClaimed(duelId, msg.sender, msg.sender);
    }

    /// @notice Admit defeat in a funded duel. Sets the other player as the winner.
    /// @param duelId The ID of the duel
    function admitDefeat(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Funded, "Duel not in Funded state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );

        address winner = msg.sender == duel.creator ? duel.opponent : duel.creator;

        duel.claimedWinner = winner;
        duel.claimedBy = msg.sender;
        duel.claimTimestamp = block.timestamp;
        duel.state = DuelState.WinnerClaimed;

        emit VictoryClaimed(duelId, msg.sender, winner);
    }

    /// @notice Request cancellation of a funded duel by mutual agreement.
    /// @param duelId The ID of the duel
    function requestMutualCancellation(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Funded, "Duel not in Funded state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );

        duel.cancelRequestedBy = msg.sender;
        duel.cancelRequestedAt = block.timestamp;
        duel.state = DuelState.MutualCancelRequested;

        emit DuelMutualCancellationRequested(duelId, msg.sender);
    }

    /// @notice Accept a pending mutual cancellation request and unlock full refunds for both players.
    /// @param duelId The ID of the duel
    function acceptMutualCancellation(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.MutualCancelRequested, "Duel not in MutualCancelRequested state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );
        require(msg.sender != duel.cancelRequestedBy, "Requester cannot accept");

        duel.finalizedAt = block.timestamp;
        duel.state = DuelState.MutuallyCancelled;
        _setPayouts(duel, duel.wagerAmount, duel.wagerAmount);

        emit DuelMutuallyCancelled(duelId, duel.cancelRequestedBy, msg.sender);
    }

    /// @notice Decline a pending mutual cancellation request and resume the duel.
    /// @param duelId The ID of the duel
    function declineMutualCancellation(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.MutualCancelRequested, "Duel not in MutualCancelRequested state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );
        require(msg.sender != duel.cancelRequestedBy, "Requester cannot decline");

        _clearMutualCancellationRequest(duel);
        duel.state = DuelState.Funded;

        emit DuelMutualCancellationDeclined(duelId, msg.sender);
    }

    /// @notice Withdraw your own pending mutual cancellation request and resume the duel.
    /// @param duelId The ID of the duel
    function withdrawMutualCancellationRequest(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.MutualCancelRequested, "Duel not in MutualCancelRequested state");
        require(msg.sender == duel.cancelRequestedBy, "Only requester can withdraw");

        _clearMutualCancellationRequest(duel);
        duel.state = DuelState.Funded;

        emit DuelMutualCancellationWithdrawn(duelId, msg.sender);
    }

    /// @notice Confirm the claimed result. Must be called by the OTHER player (not the one who called claimVictory/admitDefeat).
    /// @param duelId The ID of the duel
    function confirmResult(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.WinnerClaimed, "Duel not in WinnerClaimed state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );
        require(msg.sender != duel.claimedBy, "Cannot confirm own claim");

        duel.finalizedAt = block.timestamp;
        duel.state = DuelState.Resolved;

        playerStats[duel.creator].duelsHonored += 1;
        playerStats[duel.opponent].duelsHonored += 1;

        uint256 payout = duel.wagerAmount * 2;
        if (duel.claimedWinner == duel.creator) {
            _setPayouts(duel, payout, 0);
        } else {
            _setPayouts(duel, 0, payout);
        }

        emit DuelResolved(duelId, duel.claimedWinner, payout);
    }

    /// @notice Dispute a claimed result. Unlocks full refunds for both players with no reputation changes.
    /// @param duelId The ID of the duel
    function disputeResult(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.WinnerClaimed, "Duel not in WinnerClaimed state");
        require(
            msg.sender == duel.creator || msg.sender == duel.opponent,
            "Not a participant"
        );
        require(msg.sender != duel.claimedBy, "Cannot dispute own claim");

        duel.finalizedAt = block.timestamp;
        duel.state = DuelState.Disputed;

        _setPayouts(duel, duel.wagerAmount, duel.wagerAmount);

        emit DuelDisputed(duelId, msg.sender);
    }

    /// @notice Refund both players if the claim times out without confirmation.
    ///         Anyone can call this after the timeout period.
    /// @param duelId The ID of the duel
    function refund(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.WinnerClaimed, "Duel not in WinnerClaimed state");
        require(
            block.timestamp >= duel.claimTimestamp + CLAIM_TIMEOUT,
            "Claim timeout not reached"
        );

        duel.finalizedAt = block.timestamp;
        duel.state = DuelState.Refunded;

        // The player who made the claim behaved correctly
        playerStats[duel.claimedBy].duelsHonored += 1;

        // The non-responding player abandoned the duel
        address nonResponder = duel.claimedBy == duel.creator ? duel.opponent : duel.creator;
        playerStats[nonResponder].duelsAbandoned += 1;

        _setPayouts(duel, duel.wagerAmount, duel.wagerAmount);

        emit DuelRefunded(duelId);
    }

    /// @notice Cancel an unfunded duel and refund the creator
    /// @param duelId The ID of the duel
    function cancelDuel(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Created, "Duel not in Created state");
        require(msg.sender == duel.creator, "Only creator can cancel");

        duel.finalizedAt = block.timestamp;
        duel.state = DuelState.Cancelled;
        _setPayouts(duel, duel.wagerAmount, 0);

        emit DuelCancelled(duelId);
    }

    /// @notice Claim the payout or refund assigned to the caller for a specific duel
    /// @param duelId The ID of the duel to claim from
    function claimPayout(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(msg.sender == duel.creator || msg.sender == duel.opponent, "Not a participant");

        uint256 amount = _claimSinglePayout(duel, duelId, msg.sender);
        require(amount > 0, "Nothing to claim");

        usdt.safeTransfer(msg.sender, amount);
    }

    /// @notice Claim any available payouts for the caller across the supplied duels
    /// @param duelIds The duel IDs to attempt to claim from
    function claimPayouts(uint256[] calldata duelIds) external whenNotPaused nonReentrant {
        uint256 totalAmount;

        for (uint256 i = 0; i < duelIds.length; i++) {
            totalAmount += _claimSinglePayout(duels[duelIds[i]], duelIds[i], msg.sender);
        }

        require(totalAmount > 0, "Nothing to claim");

        usdt.safeTransfer(msg.sender, totalAmount);
    }

    /// @notice Rescue any ERC20 token accidentally sent to this contract (except USDT)
    /// @param token The ERC20 token to rescue
    /// @param to The recipient address
    /// @param amount The amount to transfer
    function rescueToken(IERC20 token, address to, uint256 amount) external onlyOwner {
        require(address(token) != address(usdt), "Cannot rescue USDT");
        require(to != address(0), "Invalid recipient");
        token.safeTransfer(to, amount);
    }

    /// @notice Rescue ETH accidentally sent to this contract
    /// @param to The recipient address
    function rescueETH(address payable to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to rescue");
        (bool success,) = to.call{value: balance}("");
        require(success, "ETH transfer failed");
    }

    // ─── Emergency token rescue (30-day timelock) ───

    /// @notice Request emergency withdrawal of any ERC20 token. Starts a 30-day countdown.
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

        emit EmergencyRequested(requestId, token, recipient, amount, block.timestamp + EMERGENCY_DELAY);
        return requestId;
    }

    /// @notice Cancel a pending emergency withdrawal
    /// @param requestId The ID of the request to cancel
    function cancelEmergencyWithdraw(uint256 requestId) external onlyOwner {
        require(emergencyRequests[requestId].requestedAt > 0, "Request not found");
        delete emergencyRequests[requestId];
        emit EmergencyCancelled(requestId);
    }

    /// @notice Execute emergency withdrawal after the 30-day timelock
    /// @param requestId The ID of the request to execute
    function executeEmergencyWithdraw(uint256 requestId) external onlyOwner {
        EmergencyRequest memory req = emergencyRequests[requestId];
        require(req.requestedAt > 0, "Request not found");
        require(
            block.timestamp >= req.requestedAt + EMERGENCY_DELAY,
            "Timelock not expired"
        );

        delete emergencyRequests[requestId];
        IERC20(req.token).safeTransfer(req.recipient, req.amount);
        emit EmergencyExecuted(requestId, req.token, req.recipient, req.amount);
    }

    // ─── Admin ───

    /// @notice Pause all duel operations (owner only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all duel operations (owner only)
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Get full duel info
    /// @param duelId The ID of the duel
    /// @return The Duel struct
    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }

    /// @notice Get a user's on-chain reputation stats
    /// @param user The address to query
    /// @return honored Number of duels resolved normally
    /// @return abandoned Number of duels where user was the non-responder
    function getPlayerStats(address user) external view returns (uint32 honored, uint32 abandoned) {
        PlayerStats memory s = playerStats[user];
        return (s.duelsHonored, s.duelsAbandoned);
    }

    function _hashInviteSecret(bytes32 inviteSecret) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(inviteSecret));
    }

    function _validateMessage(string memory message) internal pure {
        bytes memory data = bytes(message);
        uint256 byteLength = data.length;
        require(byteLength <= MAX_MESSAGE_BYTES, "Message too long");

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
            require(codePoints <= MAX_MESSAGE_CODEPOINTS, "Message too long");
            i += sequenceLength;
        }
    }

    function _setPayouts(Duel storage duel, uint256 creatorAmount, uint256 opponentAmount) internal {
        duel.creatorPayout = creatorAmount;
        duel.opponentPayout = opponentAmount;
        duel.creatorClaimed = false;
        duel.opponentClaimed = false;
    }

    function _clearMutualCancellationRequest(Duel storage duel) internal {
        duel.cancelRequestedBy = address(0);
        duel.cancelRequestedAt = 0;
    }

    function _claimSinglePayout(Duel storage duel, uint256 duelId, address player) internal returns (uint256 amount) {
        if (player == duel.creator) {
            if (duel.creatorPayout == 0 || duel.creatorClaimed) {
                return 0;
            }

            duel.creatorClaimed = true;
            amount = duel.creatorPayout;
        } else if (player == duel.opponent) {
            if (duel.opponentPayout == 0 || duel.opponentClaimed) {
                return 0;
            }

            duel.opponentClaimed = true;
            amount = duel.opponentPayout;
        } else {
            return 0;
        }

        emit DuelPayoutClaimed(duelId, player, amount);
    }
}
