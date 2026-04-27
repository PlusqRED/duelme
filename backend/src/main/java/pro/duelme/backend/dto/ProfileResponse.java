package pro.duelme.backend.dto;

import pro.duelme.backend.model.Profile;

import java.time.Instant;
import java.util.List;

public record ProfileResponse(
    String walletAddress,
    String nickname,
    String battleCry,
    String aboutMe,
    String pronouns,
    String region,
    Boolean lookingForDuel,
    List<String> games,
    SocialLinksResponse socialLinks,
    Instant createdAt,
    Instant updatedAt
) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
            profile.walletAddress(),
            profile.nickname(),
            profile.battleCry(),
            profile.aboutMe(),
            profile.pronouns(),
            profile.region(),
            profile.lookingForDuel() != null && profile.lookingForDuel(),
            profile.games(),
            SocialLinksResponse.from(profile.socialLinks()),
            profile.createdAt(),
            profile.updatedAt()
        );
    }
}
