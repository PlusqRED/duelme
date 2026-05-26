package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexInfo;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.exception.SocialVerificationFailedException;
import pro.duelme.backend.model.SocialOAuthState;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class SocialLinkStateServiceTest {

    @Autowired private SocialLinkStateService service;
    @Autowired private MongoTemplate template;

    @BeforeEach
    void setUp() {
        // Clear docs but preserve the TTL index registered at app
        // startup — dropCollection would also drop the index and break
        // ttlIndexIsRegistered when test order varies.
        template.remove(new Query(), SocialOAuthState.class);
    }

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
    void stateTokenIsShort() {
        // Regression guard: Telegram OIDC rejected the previous ~330-char
        // JWT-based state with "state too long". Keep the wire format
        // comfortably under any reasonable OAuth provider limit.
        String token = service.sign("0xabc", SocialLinkStateService.PLATFORM_TELEGRAM, "verifier");

        assertThat(token.length()).isLessThanOrEqualTo(64);
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
    void verifyConsumesTokenSoReplayFails() {
        String token = service.sign("0xabc", SocialLinkStateService.PLATFORM_STEAM, null);

        service.verify(token);

        assertThatThrownBy(() -> service.verify(token))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("Invalid");
        // And the row is truly gone, not just expired.
        assertThat(template.findById(token, SocialOAuthState.class)).isNull();
    }

    @Test
    void verifyRejectsUnknownToken() {
        assertThatThrownBy(() -> service.verify("never-issued-token"))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("Invalid");
    }

    @Test
    void verifyRejectsBlankOrNullToken() {
        assertThatThrownBy(() -> service.verify(""))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("Missing");
        assertThatThrownBy(() -> service.verify(null))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("Missing");
    }

    @Test
    void ttlIndexIsRegistered() {
        // Without this index, abandoned states would accumulate forever —
        // Spring Data MongoDB does not auto-create @Indexed declarations
        // in this project (see MongoConfig).
        IndexInfo ttl = template.indexOps(SocialOAuthState.class)
            .getIndexInfo().stream()
            .filter(idx -> idx.getIndexFields().stream()
                .anyMatch(f -> "expiresAt".equals(f.getKey())))
            .findFirst()
            .orElseThrow(() -> new AssertionError("expiresAt index missing"));

        assertThat(ttl.getExpireAfter())
            .as("TTL index must be configured with expireAfterSeconds=0")
            .contains(Duration.ZERO);
    }
}
