package pro.duelme.backend.dto;

import pro.duelme.backend.model.Profile;

import java.time.Instant;
import java.util.List;

public record ProfileResponse(
    String walletAddress,
    String nickname,
    String status,
    String aboutMe,
    List<String> games,
    SocialLinksResponse socialLinks,
    Instant createdAt,
    Instant updatedAt
) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
            profile.walletAddress(),
            profile.nickname(),
            profile.status(),
            profile.aboutMe(),
            profile.games(),
            SocialLinksResponse.from(profile.socialLinks()),
            profile.createdAt(),
            profile.updatedAt()
        );
    }
}
