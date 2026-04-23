package pro.duelme.backend.dto;

import pro.duelme.backend.model.SocialLinks;

public record SocialLinksResponse(
    SteamLinkResponse steam,
    TelegramLinkResponse telegram,
    InstagramLinkResponse instagram
) {
    public static SocialLinksResponse from(SocialLinks links) {
        if (links == null) return null;
        return new SocialLinksResponse(
            SteamLinkResponse.from(links.steam()),
            TelegramLinkResponse.from(links.telegram()),
            InstagramLinkResponse.from(links.instagram())
        );
    }
}
