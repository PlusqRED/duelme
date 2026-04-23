package pro.duelme.backend.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.KeyLengthException;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Service;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Signs and verifies short-lived state tokens used during the Steam and
 * Telegram OAuth redirect flows. The tokens carry the authenticated
 * wallet address (so the public callback endpoint can attribute the
 * link) plus the PKCE {@code code_verifier} for Telegram.
 *
 * <p>Implemented as an HS256 JWT — piggybacks on the project's existing
 * Nimbus JOSE dependency and native-image hints, with no custom format
 * to maintain.
 */
@Service
public class SocialLinkStateService {

    public static final Duration DEFAULT_TTL = Duration.ofMinutes(10);
    public static final String PLATFORM_STEAM = "STEAM";
    public static final String PLATFORM_TELEGRAM = "TELEGRAM";

    private static final String CLAIM_PLATFORM = "platform";
    private static final String CLAIM_CODE_VERIFIER = "cv";

    private final byte[] secretKey;

    public SocialLinkStateService(SocialLinkProperties props) {
        String secret = props.stateSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "duelme.social.state-secret must be set — generate >=32 bytes of entropy");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                "duelme.social.state-secret must be >=32 bytes for HS256");
        }
        this.secretKey = bytes;
    }

    public String sign(String wallet, String platform, String codeVerifier) {
        return sign(wallet, platform, codeVerifier, DEFAULT_TTL);
    }

    public String sign(String wallet, String platform, String codeVerifier, Duration ttl) {
        try {
            JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .subject(wallet)
                .claim(CLAIM_PLATFORM, platform)
                .jwtID(UUID.randomUUID().toString())
                .expirationTime(Date.from(Instant.now().plus(ttl)));
            if (codeVerifier != null) {
                claims.claim(CLAIM_CODE_VERIFIER, codeVerifier);
            }
            SignedJWT jwt = new SignedJWT(
                new JWSHeader(JWSAlgorithm.HS256),
                claims.build());
            jwt.sign(new MACSigner(secretKey));
            return jwt.serialize();
        } catch (KeyLengthException e) {
            throw new IllegalStateException("State secret too short for HS256", e);
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to sign state token", e);
        }
    }

    public StatePayload verify(String token) {
        if (token == null || token.isBlank()) {
            throw new SocialVerificationFailedException("Missing state token");
        }
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!jwt.verify(new MACVerifier(secretKey))) {
                throw new SocialVerificationFailedException("Invalid state token");
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            Date exp = claims.getExpirationTime();
            if (exp == null || exp.toInstant().isBefore(Instant.now())) {
                throw new SocialVerificationFailedException("Expired state token");
            }
            String wallet = claims.getSubject();
            String platform = claims.getStringClaim(CLAIM_PLATFORM);
            if (wallet == null || platform == null) {
                throw new SocialVerificationFailedException("Invalid state token");
            }
            return new StatePayload(wallet, platform, claims.getStringClaim(CLAIM_CODE_VERIFIER));
        } catch (ParseException | JOSEException e) {
            throw new SocialVerificationFailedException("Invalid state token");
        }
    }

    public record StatePayload(String wallet, String platform, String codeVerifier) {}
}
