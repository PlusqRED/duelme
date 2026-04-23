package pro.duelme.backend.dto;

import pro.duelme.backend.model.TelegramLink;

import java.time.Instant;

public record TelegramLinkResponse(
    String telegramId,
    String username,
    String displayName,
    String photoUrl,
    Instant linkedAt
) {
    public static TelegramLinkResponse from(TelegramLink link) {
        if (link == null) return null;
        return new TelegramLinkResponse(
            link.telegramId(), link.username(), link.displayName(), link.photoUrl(), link.linkedAt());
    }
}
