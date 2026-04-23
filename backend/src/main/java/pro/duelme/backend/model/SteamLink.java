package pro.duelme.backend.model;

import java.time.Instant;

public record SteamLink(
    String steamId,
    String username,
    String avatarUrl,
    Instant linkedAt
) {}
