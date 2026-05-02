package pro.duelme.backend.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SteamProfileFetcherTest {

    @Test
    void usableAvatarUrlKeepsCustomSteamAvatar() {
        String avatarUrl = "https://avatars.steamstatic.com/custom_full.jpg";

        assertThat(SteamProfileFetcher.usableAvatarUrl(
            "0123456789abcdef0123456789abcdef01234567",
            avatarUrl
        )).isEqualTo(avatarUrl);
    }

    @Test
    void usableAvatarUrlRejectsDefaultSteamHash() {
        assertThat(SteamProfileFetcher.usableAvatarUrl(
            "0000000000000000000000000000000000000000",
            "https://avatars.steamstatic.com/custom_full.jpg"
        )).isNull();
    }

    @Test
    void usableAvatarUrlRejectsDefaultSteamUrl() {
        assertThat(SteamProfileFetcher.usableAvatarUrl(
            null,
            "https://avatars.steamstatic.com/0000000000000000000000000000000000000000_full.jpg?size=184"
        )).isNull();
    }

    @Test
    void usableAvatarUrlRejectsDefaultSteamUrlCaseInsensitively() {
        assertThat(SteamProfileFetcher.usableAvatarUrl(
            null,
            "https://avatars.steamstatic.com/0000000000000000000000000000000000000000_FULL.JPG"
        )).isNull();
    }

    @Test
    void usableAvatarUrlRejectsBlankUrl() {
        assertThat(SteamProfileFetcher.usableAvatarUrl(
            "0123456789abcdef0123456789abcdef01234567",
            " "
        )).isNull();
    }
}
