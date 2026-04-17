package pro.duelme.backend.dto;

import java.time.Instant;

public record FaucetClaimResponse(
    String walletAddress,
    String ethTxHash,
    String usdtTxHash,
    Instant createdAt
) {}
