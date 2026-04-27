package pro.duelme.backend.service;

import org.junit.jupiter.api.Test;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialLinkStateServiceTest {

    private static final String SECRET = "test-state-secret-32-bytes-long-enough-hmac-sha256";

    private final SocialLinkStateService service = new SocialLinkStateService(
        new SocialLinkProperties(
            "http://localhost:3000",
            SECRET,
            new SocialLinkProperties.Steam(null, null),
            new SocialLinkProperties.Telegram(null, null, null, null)
        )
    );

    @Test
    void signThenVerifyReturnsOriginalPayload() {
        String token = service.sign("0xabc", SocialLinkStateService.PLATFORM_STEAM, null);

        var payload = service.verify(token);

        assertThat(payload.wallet()).isEqualTo("0xabc");
        assertThat(payload.platform()).isEqualTo(SocialLinkStateService.PLATFORM_STEAM);
        assertThat(payload.codeVerifier()).isNull();
    }

    @Test
    void signWithCodeVerifierRoundTrips() {
        String verifier = "U5zKr8dLv3JkXmNpQ2aW1YxZoRfHeCiBtPgMqSwVhFuEjDbAcTiGkVnXyWhOsLdEr";

        String token = service.sign("0xdef", SocialLinkStateService.PLATFORM_TELEGRAM, verifier);
        var payload = service.verify(token);

        assertThat(payload.wallet()).isEqualTo("0xdef");
        assertThat(payload.platform()).isEqualTo(SocialLinkStateService.PLATFORM_TELEGRAM);
        assertThat(payload.codeVerifier()).isEqualTo(verifier);
    }

    @Test
    void verifyRejectsExpiredToken() throws InterruptedException {
        String token = service.sign("0xabc",
            SocialLinkStateService.PLATFORM_STEAM, null, Duration.ofMillis(1));

        Thread.sleep(50);

        assertThatThrownBy(() -> service.verify(token))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("Expired");
    }

    @Test
    void verifyRejectsTamperedToken() {
        String token = service.sign("0xabc", SocialLinkStateService.PLATFORM_STEAM, null);
        // flip the last character of the signature
        char last = token.charAt(token.length() - 1);
        char flipped = last == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, token.length() - 1) + flipped;

        assertThatThrownBy(() -> service.verify(tampered))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyRejectsDifferentSecret() {
        String token = service.sign("0xabc", SocialLinkStateService.PLATFORM_STEAM, null);

        var otherService = new SocialLinkStateService(
            new SocialLinkProperties(
                "http://localhost:3000",
                "different-secret-32-bytes-long-for-hmac-sha256-abc",
                new SocialLinkProperties.Steam(null, null),
                new SocialLinkProperties.Telegram(null, null, null, null)
            )
        );

        assertThatThrownBy(() -> otherService.verify(token))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyRejectsMalformedToken() {
        assertThatThrownBy(() -> service.verify("not-a-jwt"))
            .isInstanceOf(SocialVerificationFailedException.class);
        assertThatThrownBy(() -> service.verify(""))
            .isInstanceOf(SocialVerificationFailedException.class);
        assertThatThrownBy(() -> service.verify(null))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void constructorRejectsBlankSecret() {
        assertThatThrownBy(() -> new SocialLinkStateService(
            new SocialLinkProperties("http://localhost", "",
                new SocialLinkProperties.Steam(null, null),
                new SocialLinkProperties.Telegram(null, null, null, null))
        )).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void constructorRejectsShortSecret() {
        assertThatThrownBy(() -> new SocialLinkStateService(
            new SocialLinkProperties("http://localhost", "too-short",
                new SocialLinkProperties.Steam(null, null),
                new SocialLinkProperties.Telegram(null, null, null, null))
        )).isInstanceOf(IllegalStateException.class);
    }
}
