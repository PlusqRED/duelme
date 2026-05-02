package pro.duelme.backend.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.ExternalSocialServiceException;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.net.URI;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Verifies ID tokens issued by Telegram's OIDC provider
 * ({@code oauth.telegram.org}). Mirrors the pattern used by
 * {@code PrivyJwksService} — JWKS fetched lazily and cached for five
 * minutes so key rotation is picked up without hard-coupling to any
 * specific key identifier.
 *
 * <p>Telegram signs ID tokens with RS256.
 */
@Service
public class TelegramJwksService {

    private static final Logger log = LoggerFactory.getLogger(TelegramJwksService.class);
    private static final long JWKS_CACHE_SECONDS = 300L;

    private final String issuer;
    private final String clientId;
    private final String jwksUrl;
    private final AtomicReference<CachedJwks> cachedJwks = new AtomicReference<>();

    private record CachedJwks(JWKSet jwkSet, Instant fetchedAt) {}

    public TelegramJwksService(SocialLinkProperties props) {
        this.issuer = props.telegram().issuer();
        this.clientId = props.telegram().clientId();
        this.jwksUrl = issuer + "/.well-known/jwks.json";
    }

    /**
     * Verifies the signature, issuer, audience, and expiry of a Telegram
     * ID token and returns the claims we care about. Called with the
     * {@code id_token} string exactly as received from the Telegram
     * token endpoint.
     */
    public TelegramClaims verifyIdToken(String idToken) {
        JWTClaimsSet claims;
        try {
            JWKSet jwkSet = getJwkSet();
            JWKSource<SecurityContext> keySource = new ImmutableJWKSet<>(jwkSet);
            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource));
            claims = processor.process(idToken, null);
        } catch (Exception e) {
            log.debug("Telegram ID token verification failed: {}", e.getMessage());
            throw new SocialVerificationFailedException("Invalid Telegram ID token");
        }

        if (!issuer.equals(claims.getIssuer())) {
            throw new SocialVerificationFailedException("Telegram ID token issuer mismatch");
        }
        if (claims.getAudience() == null || !claims.getAudience().contains(clientId)) {
            throw new SocialVerificationFailedException("Telegram ID token audience mismatch");
        }

        String sub = claims.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new SocialVerificationFailedException("Telegram ID token missing sub");
        }

        String picture = readNonBlankStringClaim(claims, "picture");
        if (picture == null) {
            picture = readNonBlankStringClaim(claims, "photo_url");
        }

        return new TelegramClaims(
            sub,
            readStringClaim(claims, "preferred_username"),
            readStringClaim(claims, "name"),
            picture
        );
    }

    private static String readStringClaim(JWTClaimsSet claims, String name) {
        try {
            return claims.getStringClaim(name);
        } catch (java.text.ParseException e) {
            return null;
        }
    }

    private static String readNonBlankStringClaim(JWTClaimsSet claims, String name) {
        String value = readStringClaim(claims, name);
        return value == null || value.isBlank() ? null : value.trim();
    }

    private JWKSet getJwkSet() {
        CachedJwks cached = cachedJwks.get();
        if (cached != null && cached.fetchedAt().isAfter(Instant.now().minusSeconds(JWKS_CACHE_SECONDS))) {
            return cached.jwkSet();
        }
        try {
            JWKSet jwkSet = JWKSet.load(URI.create(jwksUrl).toURL());
            cachedJwks.set(new CachedJwks(jwkSet, Instant.now()));
            return jwkSet;
        } catch (Exception e) {
            throw new ExternalSocialServiceException("Failed to fetch Telegram JWKS", e);
        }
    }

    /** Test-only: seed the JWKS cache so verification works without a live endpoint. */
    void seedJwksForTest(JWKSet jwkSet) {
        cachedJwks.set(new CachedJwks(jwkSet, Instant.now()));
    }

    public record TelegramClaims(
        String sub,
        String preferredUsername,
        String name,
        String picture
    ) {}
}
