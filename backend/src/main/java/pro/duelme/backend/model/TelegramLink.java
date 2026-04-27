package pro.duelme.backend.model;

import java.time.Instant;

public record TelegramLink(
    String telegramId,
    String username,
    String displayName,
    String photoUrl,
    Instant linkedAt
) {}
