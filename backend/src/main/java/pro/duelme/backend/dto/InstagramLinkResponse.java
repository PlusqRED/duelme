package pro.duelme.backend.dto;

import pro.duelme.backend.model.InstagramLink;

import java.time.Instant;

public record InstagramLinkResponse(
    String handle,
    Instant linkedAt
) {
    public static InstagramLinkResponse from(InstagramLink link) {
        if (link == null) return null;
        return new InstagramLinkResponse(link.handle(), link.linkedAt());
    }
}
