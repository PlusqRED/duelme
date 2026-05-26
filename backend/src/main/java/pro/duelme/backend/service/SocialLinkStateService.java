package pro.duelme.backend.service;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import pro.duelme.backend.exception.SocialVerificationFailedException;
import pro.duelme.backend.model.SocialOAuthState;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Mints and consumes the {@code state} parameter used during Steam and
 * Telegram OAuth redirects. We store the wallet (and PKCE
 * {@code code_verifier} for Telegram) server-side keyed by a random
 * opaque token; the token itself is the only thing that travels through
 * the OAuth roundtrip.
 *
 * <p>Telegram's OIDC server enforces an undocumented but tight limit on
 * the state parameter length, so we can't ship the payload inline as a
 * signed JWT — a server-side lookup keeps the wire format down to ~32
 * chars.
 *
 * <p>{@link #verify} uses an atomic {@code findAndRemove} so each state
 * token can be consumed at most once, even under concurrent callbacks.
 * Abandoned (never-verified) records are reaped by Mongo's TTL monitor
 * via the index on {@code expiresAt} — see
 * {@code MongoConfig#ensureSocialOAuthStateIndexes}.
 */
@Service
public class SocialLinkStateService {

    public static final Duration DEFAULT_TTL = Duration.ofMinutes(10);
    public static final String PLATFORM_STEAM = "STEAM";
    public static final String PLATFORM_TELEGRAM = "TELEGRAM";

    // 24 random bytes → 32-char base64url, 192 bits of entropy.
    private static final int TOKEN_BYTES = 24;

    private final MongoTemplate template;
    private final SecureRandom random = new SecureRandom();

    public SocialLinkStateService(MongoTemplate template) {
        this.template = template;
    }

    public String sign(String wallet, String platform, String codeVerifier) {
        return sign(wallet, platform, codeVerifier, DEFAULT_TTL);
    }

    public String sign(String wallet, String platform, String codeVerifier, Duration ttl) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        template.save(new SocialOAuthState(
            token, wallet, platform, codeVerifier, Instant.now().plus(ttl)));
        return token;
    }

    public StatePayload verify(String token) {
        if (token == null || token.isBlank()) {
            throw new SocialVerificationFailedException("Missing state token");
        }
        SocialOAuthState state = template.findAndRemove(
            Query.query(Criteria.where("_id").is(token)),
            SocialOAuthState.class);
        if (state == null) {
            throw new SocialVerificationFailedException("Invalid state token");
        }
        if (state.expiresAt().isBefore(Instant.now())) {
            throw new SocialVerificationFailedException("Expired state token");
        }
        return new StatePayload(state.wallet(), state.platform(), state.codeVerifier());
    }

    public record StatePayload(String wallet, String platform, String codeVerifier) {}
}
