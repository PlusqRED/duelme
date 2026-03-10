// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

    uint256 public duelCount;

    enum DuelState {
        Created,
        Funded,
        WinnerClaimed,
        Resolved,
        Refunded,
        Cancelled
    }

    struct Duel {
        address creator;
        address opponent;
        uint256 wagerAmount;
        address claimedWinner;
        address claimedBy;
        uint256 claimTimestamp;
        DuelState state;
    }

    struct PlayerStats {
        uint32 duelsHonored;   // resolved normally (both confirmed)
        uint32 duelsAbandoned; // this player was the non-responder in a refund
    }

    mapping(uint256 => Duel) public duels;
    mapping(address => PlayerStats) public playerStats;

    event DuelCreated(uint256 indexed duelId, address indexed creator, uint256 wagerAmount);
    event DuelJoined(uint256 indexed duelId, address indexed opponent);
    event VictoryClaimed(uint256 indexed duelId, address indexed claimedBy, address indexed claimedWinner);
    event DuelResolved(uint256 indexed duelId, address indexed winner, uint256 amount);
    event DuelRefunded(uint256 indexed duelId);
    event DuelCancelled(uint256 indexed duelId);

    constructor(address _usdt) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        usdt = IERC20(_usdt);
    }

    /// @notice Create a new duel by depositing a USDT wager
    /// @param amount The wager amount in USDT (6 decimals)
    /// @return duelId The unique identifier for the created duel
    function createDuel(uint256 amount) external whenNotPaused nonReentrant returns (uint256) {
        require(amount >= MIN_WAGER, "Wager below minimum");

        usdt.safeTransferFrom(msg.sender, address(this), amount);

        uint256 duelId = duelCount;
        duelCount++;

        duels[duelId] = Duel({
            creator: msg.sender,
            opponent: address(0),
            wagerAmount: amount,
            claimedWinner: address(0),
            claimedBy: address(0),
            claimTimestamp: 0,
            state: DuelState.Created
        });

        emit DuelCreated(duelId, msg.sender, amount);
        return duelId;
    }

    /// @notice Join an existing duel by depositing the matching wager
    /// @param duelId The ID of the duel to join
    function joinDuel(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Created, "Duel not in Created state");
        require(msg.sender != duel.creator, "Cannot join own duel");

        usdt.safeTransferFrom(msg.sender, address(this), duel.wagerAmount);

        duel.opponent = msg.sender;
        duel.state = DuelState.Funded;

        emit DuelJoined(duelId, msg.sender);
    }

    /// @notice Claim victory in a funded duel. Starts a 1-hour countdown for the opponent to confirm or dispute.
    /// @param duelId The ID of the duel
    function claimVictory(uint256 duelId) external whenNotPaused {
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
    function admitDefeat(uint256 duelId) external whenNotPaused {
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

        duel.state = DuelState.Resolved;

        playerStats[duel.creator].duelsHonored += 1;
        playerStats[duel.opponent].duelsHonored += 1;

        uint256 payout = duel.wagerAmount * 2;
        usdt.safeTransfer(duel.claimedWinner, payout);

        emit DuelResolved(duelId, duel.claimedWinner, payout);
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

        duel.state = DuelState.Refunded;

        // The player who made the claim behaved correctly
        playerStats[duel.claimedBy].duelsHonored += 1;

        // The non-responding player abandoned the duel
        address nonResponder = duel.claimedBy == duel.creator ? duel.opponent : duel.creator;
        playerStats[nonResponder].duelsAbandoned += 1;

        usdt.safeTransfer(duel.creator, duel.wagerAmount);
        usdt.safeTransfer(duel.opponent, duel.wagerAmount);

        emit DuelRefunded(duelId);
    }

    /// @notice Cancel an unfunded duel and refund the creator
    /// @param duelId The ID of the duel
    function cancelDuel(uint256 duelId) external whenNotPaused nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Created, "Duel not in Created state");
        require(msg.sender == duel.creator, "Only creator can cancel");

        duel.state = DuelState.Cancelled;

        usdt.safeTransfer(duel.creator, duel.wagerAmount);

        emit DuelCancelled(duelId);
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
}
