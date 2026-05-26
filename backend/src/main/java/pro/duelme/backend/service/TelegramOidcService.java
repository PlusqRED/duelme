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
import pro.duelme.backend.dto.TelegramTokenResponse;
import pro.duelme.backend.exception.ExternalSocialServiceException;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Drives Telegram's OIDC authorization-code flow (launched April 2026).
 * The authorization URL carries a PKCE challenge; the matching verifier
 * is stashed alongside the wallet in {@code SocialLinkStateService} so
 * the public callback can complete the token exchange without a Bearer
 * header.
 */
@Service
public class TelegramOidcService {

    private static final Logger log = LoggerFactory.getLogger(TelegramOidcService.class);
    private static final String SCOPE = "openid profile";

    private final RestClient restClient;
    private final TelegramJwksService jwksService;
    private final SocialLinkProperties props;
    private final SecureRandom random = new SecureRandom();

    public TelegramOidcService(
        @Qualifier("socialRestClient") RestClient restClient,
        TelegramJwksService jwksService,
        SocialLinkProperties props
    ) {
        this.restClient = restClient;
        this.jwksService = jwksService;
        this.props = props;
    }

    /**
     * Generates a PKCE-compliant code verifier (32 random bytes,
     * base64url-encoded). Callers persist the verifier alongside the
     * state record so the callback handler can re-send it to the token
     * endpoint.
     */
    public String generateCodeVerifier() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Builds the Telegram OIDC authorization URL with the given state
     * and PKCE {@code code_challenge} derived from {@code codeVerifier}.
     */
    public String buildAuthUrl(String state, String codeVerifier) {
        String codeChallenge = computeCodeChallenge(codeVerifier);
        return UriComponentsBuilder.fromUriString(props.telegram().issuer() + "/auth")
            .queryParam("client_id", props.telegram().clientId())
            .queryParam("redirect_uri", props.telegram().returnUrl())
            .queryParam("response_type", "code")
            .queryParam("scope", SCOPE)
            .queryParam("state", state)
            .queryParam("code_challenge", codeChallenge)
            .queryParam("code_challenge_method", "S256")
            .build()
            .toUriString();
    }

    /**
     * Exchanges the authorization code for an ID token and verifies it.
     * Throws {@link SocialVerificationFailedException} on any integrity
     * failure and {@link ExternalSocialServiceException} if Telegram's
     * token endpoint is unreachable or malformed.
     */
    public TelegramUserInfo exchangeCode(String code, String codeVerifier) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("code", code);
        form.add("redirect_uri", props.telegram().returnUrl());
        form.add("code_verifier", codeVerifier);
        form.add("client_id", props.telegram().clientId());
        form.add("client_secret", props.telegram().clientSecret());

        TelegramTokenResponse tokenResponse;
        try {
            tokenResponse = restClient.post()
                .uri(props.telegram().issuer() + "/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(TelegramTokenResponse.class);
        } catch (RestClientException e) {
            log.debug("Telegram token exchange failed", e);
            throw new ExternalSocialServiceException(
                "Telegram is temporarily unreachable", e);
        }

        if (tokenResponse == null || tokenResponse.idToken() == null) {
            throw new SocialVerificationFailedException("Telegram returned no id_token");
        }

        TelegramJwksService.TelegramClaims claims =
            jwksService.verifyIdToken(tokenResponse.idToken());

        String displayName = claims.name() != null
            ? claims.name()
            : claims.preferredUsername() != null ? claims.preferredUsername() : claims.sub();

        return new TelegramUserInfo(
            claims.sub(),
            claims.preferredUsername(),
            displayName,
            claims.picture()
        );
    }

    private static String computeCodeChallenge(String verifier) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record TelegramUserInfo(
        String telegramId,
        String username,
        String displayName,
        String photoUrl
    ) {}
}
