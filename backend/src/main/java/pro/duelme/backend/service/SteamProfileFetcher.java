package pro.duelme.backend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import pro.duelme.backend.config.SocialLinkProperties;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Best-effort enrichment of a linked Steam account with the user's
 * display name and avatar URL. Requires a Steam Web API key — if the
 * key is unset, {@link #fetch(String)} returns {@link Optional#empty()}
 * without attempting a call. All errors are swallowed: failure here
 * must never block a link operation.
 */
@Service
public class SteamProfileFetcher {

    private static final Logger log = LoggerFactory.getLogger(SteamProfileFetcher.class);
    private static final String DEFAULT_AVATAR_HASH = "0000000000000000000000000000000000000000";

    private final RestClient restClient;
    private final String apiKey;

    public SteamProfileFetcher(
        @Qualifier("socialRestClient") RestClient restClient,
        SocialLinkProperties props
    ) {
        this.restClient = restClient;
        this.apiKey = props.steam().apiKey();
    }

    public Optional<SteamPlayerSummary> fetch(String steamId) {
        if (apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            SummariesResponse response = restClient.get()
                .uri(uri -> uri.scheme("https").host("api.steampowered.com")
                    .path("/ISteamUser/GetPlayerSummaries/v2/")
                    .queryParam("key", apiKey)
                    .queryParam("steamids", steamId)
                    .build())
                .retrieve()
                .body(SummariesResponse.class);

            if (response == null || response.response() == null) {
                return Optional.empty();
            }
            List<Player> players = response.response().players();
            if (players == null || players.isEmpty()) {
                return Optional.empty();
            }
            Player p = players.get(0);
            return Optional.of(new SteamPlayerSummary(
                p.personaname(),
                usableAvatarUrl(p.avatarhash(), p.avatarfull())
            ));
        } catch (RuntimeException e) {
            log.warn("Steam profile fetch failed for {}: {}", steamId, e.getMessage());
            return Optional.empty();
        }
    }

    static String usableAvatarUrl(String avatarHash, String avatarUrl) {
        String url = blankToNull(avatarUrl);
        if (url == null || isDefaultAvatarHashFromUrl(url)) {
            return null;
        }
        String hash = blankToNull(avatarHash);
        if (hash != null && DEFAULT_AVATAR_HASH.equalsIgnoreCase(hash)) {
            return null;
        }
        return url;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean isDefaultAvatarHashFromUrl(String url) {
        String lowerUrl = url.toLowerCase(Locale.ROOT);
        return lowerUrl.contains("/" + DEFAULT_AVATAR_HASH + ".jpg")
            || lowerUrl.contains("/" + DEFAULT_AVATAR_HASH + "_medium.jpg")
            || lowerUrl.contains("/" + DEFAULT_AVATAR_HASH + "_full.jpg");
    }

    public record SteamPlayerSummary(String username, String avatarUrl) {}

    private record SummariesResponse(@JsonProperty("response") InnerResponse response) {}
    private record InnerResponse(List<Player> players) {}
    private record Player(String steamid, String personaname, String avatarhash, String avatarfull) {}
}
