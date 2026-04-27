package pro.duelme.backend.model;

import java.time.Instant;

public record InstagramLink(
    String handle,
    Instant linkedAt
) {}
