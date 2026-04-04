package pro.duelme.backend.dto;

import pro.duelme.backend.model.GameCategory;

import java.time.Instant;

public record DuelMetaResponse(
    long duelId,
    int chainId,
    String gameSlug,
    String gameName,
    GameCategory category,
    String creatorAddress,
    Instant createdAt
) {}
