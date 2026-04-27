package pro.duelme.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Token-endpoint response from Telegram OIDC. Matches
 * {@code https://oauth.telegram.org/token} for the authorization-code
 * grant. Only {@code idToken} is actually consumed — the access token
 * is not used because Telegram has no UserInfo endpoint and all user
 * data is already in the ID token.
 */
public record TelegramTokenResponse(
    @JsonProperty("token_type") String tokenType,
    @JsonProperty("access_token") String accessToken,
    @JsonProperty("id_token") String idToken,
    @JsonProperty("expires_in") Long expiresIn,
    String scope
) {}
