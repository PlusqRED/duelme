package pro.duelme.backend.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TelegramJwksServiceTest {

    private static final String ISSUER = "https://oauth.telegram.org";
    private static final String CLIENT_ID = "test-telegram-client-id";

    private static RSAKey rsaKey;
    private static JWKSet jwkSet;

    @BeforeAll
    static void setupKeys() throws JOSEException {
        rsaKey = new RSAKeyGenerator(2048)
            .keyUse(KeyUse.SIGNATURE)
            .keyID("test-key-1")
            .generate();
        jwkSet = new JWKSet(rsaKey.toPublicJWK());
    }

    private TelegramJwksService service() {
        var service = new TelegramJwksService(
            new SocialLinkProperties(
                "http://localhost:3000",
                "any-secret",
                new SocialLinkProperties.Steam(null, null),
                new SocialLinkProperties.Telegram(CLIENT_ID, "client-secret", "return-url", ISSUER)
            )
        );
        service.seedJwksForTest(jwkSet);
        return service;
    }

    private static String signToken(JWTClaimsSet claims) throws JOSEException {
        SignedJWT jwt = new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(rsaKey.getKeyID()).build(),
            claims
        );
        jwt.sign(new RSASSASigner(rsaKey));
        return jwt.serialize();
    }

    @Test
    void verifyValidTokenReturnsClaims() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(CLIENT_ID)
            .subject("123456789")
            .claim("name", "Alice")
            .claim("preferred_username", "alice_tg")
            .claim("picture", "https://telesco.pe/pic")
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        var claims = service().verifyIdToken(token);

        assertThat(claims.sub()).isEqualTo("123456789");
        assertThat(claims.name()).isEqualTo("Alice");
        assertThat(claims.preferredUsername()).isEqualTo("alice_tg");
        assertThat(claims.picture()).isEqualTo("https://telesco.pe/pic");
    }

    @Test
    void verifyAcceptsTelegramPhotoUrlClaimAsPictureFallback() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(CLIENT_ID)
            .subject("123456789")
            .claim("photo_url", "https://telesco.pe/photo-url")
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        var claims = service().verifyIdToken(token);

        assertThat(claims.picture()).isEqualTo("https://telesco.pe/photo-url");
    }

    @Test
    void verifyUsesPhotoUrlWhenPictureClaimIsBlank() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(CLIENT_ID)
            .subject("123456789")
            .claim("picture", " ")
            .claim("photo_url", "https://telesco.pe/photo-url")
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        var claims = service().verifyIdToken(token);

        assertThat(claims.picture()).isEqualTo("https://telesco.pe/photo-url");
    }

    @Test
    void verifyRejectsWrongIssuer() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer("https://evil.example.com")
            .audience(CLIENT_ID)
            .subject("123")
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        assertThatThrownBy(() -> service().verifyIdToken(token))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("issuer");
    }

    @Test
    void verifyRejectsWrongAudience() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience("some-other-client")
            .subject("123")
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        assertThatThrownBy(() -> service().verifyIdToken(token))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("audience");
    }

    @Test
    void verifyRejectsExpiredToken() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(CLIENT_ID)
            .subject("123")
            .expirationTime(Date.from(Instant.now().minusSeconds(60)))
            .build());

        assertThatThrownBy(() -> service().verifyIdToken(token))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyRejectsTokenSignedWithDifferentKey() throws JOSEException {
        RSAKey otherKey = new RSAKeyGenerator(2048)
            .keyUse(KeyUse.SIGNATURE)
            .keyID("different-key")
            .generate();
        SignedJWT jwt = new SignedJWT(
            new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("different-key").build(),
            new JWTClaimsSet.Builder()
                .issuer(ISSUER)
                .audience(CLIENT_ID)
                .subject("123")
                .expirationTime(Date.from(Instant.now().plusSeconds(600)))
                .build()
        );
        jwt.sign(new RSASSASigner(otherKey));

        assertThatThrownBy(() -> service().verifyIdToken(jwt.serialize()))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyRejectsMalformedToken() {
        assertThatThrownBy(() -> service().verifyIdToken("not-a-jwt"))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyRejectsTokenMissingSub() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(CLIENT_ID)
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        assertThatThrownBy(() -> service().verifyIdToken(token))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyAcceptsMultiAudienceListIncludingOurs() throws JOSEException {
        String token = signToken(new JWTClaimsSet.Builder()
            .issuer(ISSUER)
            .audience(List.of(CLIENT_ID, "some-other-client"))
            .subject("987")
            .expirationTime(Date.from(Instant.now().plusSeconds(600)))
            .build());

        var claims = service().verifyIdToken(token);
        assertThat(claims.sub()).isEqualTo("987");
    }
}
