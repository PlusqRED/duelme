package pro.duelme.backend.dto;

import java.time.Instant;

public record DuelMetaResponse(
    long duelId,
    int chainId,
    String gameSlug,
    String gameName,
    String creatorAddress,
    Instant createdAt
) {}
