package pro.duelme.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.ExternalSocialServiceException;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Implements Steam's OpenID 2.0 authentication flow. Steam has never
 * adopted OIDC/OAuth 2.0 for its public login — OpenID 2.0 is the
 * only supported protocol, despite being superseded elsewhere.
 *
 * <p>Flow: {@link #buildAuthUrl(String)} issues a redirect URL to
 * {@code steamcommunity.com/openid/login}. After the user signs in,
 * Steam redirects back to our configured {@code return_to} URL with
 * a set of {@code openid.*} query parameters plus our state token.
 * {@link #verifyCallback(Map)} posts those params back to Steam with
 * {@code mode=check_authentication}; Steam responds with either
 * {@code is_valid:true} or {@code is_valid:false} on a dedicated line.
 * Only on {@code true} do we accept the {@code claimed_id} as proof of
 * Steam ownership.
 */
@Service
public class SteamOpenIdService {

    private static final Logger log = LoggerFactory.getLogger(SteamOpenIdService.class);

    public static final String STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
    private static final Pattern STEAM_ID_PATTERN =
        Pattern.compile("^https?://steamcommunity\\.com/openid/id/(\\d{17})$");

    private final RestClient restClient;
    private final SocialLinkProperties props;

    public SteamOpenIdService(
        @Qualifier("socialRestClient") RestClient restClient,
        SocialLinkProperties props
    ) {
        this.restClient = restClient;
        this.props = props;
    }

    public String buildAuthUrl(String state) {
        String returnTo = appendStateParam(props.steam().returnUrl(), state);
        return UriComponentsBuilder.fromUriString(STEAM_OPENID_URL)
            .queryParam("openid.ns", "http://specs.openid.net/auth/2.0")
            .queryParam("openid.mode", "checkid_setup")
            .queryParam("openid.return_to", returnTo)
            .queryParam("openid.realm", props.appBaseUrl())
            .queryParam("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select")
            .queryParam("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select")
            .build()
            .toUriString();
    }

    /**
     * Posts the callback params back to Steam to validate the signature,
     * then parses {@code openid.claimed_id} to extract the 17-digit
     * Steam ID. Throws {@link SocialVerificationFailedException} on any
     * integrity failure and {@link ExternalSocialServiceException} if
     * Steam's endpoint is unreachable.
     *
     * <p>Per OpenID 2.0 §11.1 the relying party MUST verify that
     * {@code openid.return_to} matches the URL the RP sent to the OP.
     * Without this check an attacker holding a valid Steam signature
     * could replay it against a different endpoint on our domain.
     */
    public String verifyCallback(Map<String, String> openIdParams) {
        String claimedId = openIdParams.get("openid.claimed_id");
        if (claimedId == null || claimedId.isBlank()) {
            throw new SocialVerificationFailedException("Missing openid.claimed_id");
        }
        if (!"id_res".equals(openIdParams.get("openid.mode"))) {
            throw new SocialVerificationFailedException("Unexpected openid.mode");
        }
        Matcher matcher = STEAM_ID_PATTERN.matcher(claimedId);
        if (!matcher.matches()) {
            throw new SocialVerificationFailedException("Invalid Steam claimed_id format");
        }

        String state = openIdParams.get("state");
        String returnTo = openIdParams.get("openid.return_to");
        String expectedReturnTo = state == null || state.isBlank()
            ? null
            : appendStateParam(props.steam().returnUrl(), state);
        if (returnTo == null || expectedReturnTo == null
            || !returnTo.equals(expectedReturnTo)) {
            throw new SocialVerificationFailedException("openid.return_to mismatch");
        }

        // Send only openid.* params to check_authentication — stripping our
        // own `state` query param avoids confusing Steam and keeps the
        // request faithful to the original id_res response.
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        openIdParams.forEach((k, v) -> {
            if (k.startsWith("openid.")) form.add(k, v);
        });
        form.set("openid.mode", "check_authentication");

        String response;
        try {
            response = restClient.post()
                .uri(STEAM_OPENID_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class);
        } catch (RestClientException e) {
            log.debug("Steam check_authentication call failed", e);
            throw new ExternalSocialServiceException(
                "Steam is temporarily unreachable", e);
        }

        if (response == null || !containsValidLine(response)) {
            throw new SocialVerificationFailedException("Steam rejected OpenID response");
        }

        return matcher.group(1);
    }

    private static boolean containsValidLine(String body) {
        for (String line : body.split("\\r?\\n")) {
            if ("is_valid:true".equals(line.trim())) {
                return true;
            }
        }
        return false;
    }

    private static String appendStateParam(String baseUrl, String state) {
        return UriComponentsBuilder.fromUriString(baseUrl)
            .queryParam("state", state)
            .build()
            .toUriString();
    }
}
