package pro.duelme.backend.dto;

import pro.duelme.backend.model.GameCategory;

import java.time.Instant;

public record GameResponse(
    String slug,
    String name,
    String iconUrl,
    GameCategory category,
    long duelCount,
    long totalVolume,
    Instant createdAt,
    Instant updatedAt
) {}
