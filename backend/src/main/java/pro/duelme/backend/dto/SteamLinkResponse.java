package pro.duelme.backend.dto;

import pro.duelme.backend.model.SteamLink;

import java.time.Instant;

public record SteamLinkResponse(
    String steamId,
    String username,
    String avatarUrl,
    Instant linkedAt
) {
    public static SteamLinkResponse from(SteamLink link) {
        if (link == null) return null;
        return new SteamLinkResponse(link.steamId(), link.username(), link.avatarUrl(), link.linkedAt());
    }
}
