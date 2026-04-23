package pro.duelme.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.ExternalSocialServiceException;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TelegramOidcServiceTest {

    private static final String ISSUER = "https://oauth.telegram.org";
    private static final String CLIENT_ID = "test-client-id";
    private static final String CLIENT_SECRET = "test-client-secret";
    private static final String RETURN_URL =
        "http://localhost:8080/api/v1/profiles/me/social/telegram/callback";

    private SocialLinkProperties props() {
        return new SocialLinkProperties(
            "http://localhost:3000",
            "any-secret",
            new SocialLinkProperties.Steam(null, null),
            new SocialLinkProperties.Telegram(CLIENT_ID, CLIENT_SECRET, RETURN_URL, ISSUER)
        );
    }

    private record Harness(TelegramOidcService service, MockRestServiceServer server,
                           TelegramJwksService jwks) {}

    private Harness build() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        TelegramJwksService jwks = mock(TelegramJwksService.class);
        TelegramOidcService service = new TelegramOidcService(builder.build(), jwks, props());
        return new Harness(service, server, jwks);
    }

    @Test
    void buildAuthUrlIncludesAllRequiredParams() {
        var h = build();

        String verifier = h.service().generateCodeVerifier();
        String url = h.service().buildAuthUrl("state-123", verifier);

        assertThat(url).startsWith(ISSUER + "/auth");
        assertThat(url).contains("client_id=" + CLIENT_ID);
        assertThat(url).contains("response_type=code");
        assertThat(url).contains("scope=openid");
        assertThat(url).contains("state=state-123");
        assertThat(url).contains("code_challenge_method=S256");
        assertThat(url).contains("code_challenge=");
        assertThat(verifier).isNotBlank();
        // Code verifier should be 43+ characters (32 bytes base64url ≈ 43)
        assertThat(verifier.length()).isGreaterThanOrEqualTo(43);
    }

    @Test
    void generateCodeVerifierProducesDistinctValues() {
        var h = build();

        String a = h.service().generateCodeVerifier();
        String b = h.service().generateCodeVerifier();

        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void exchangeCodeSuccess() {
        var h = build();
        when(h.jwks().verifyIdToken("fake.id.token"))
            .thenReturn(new TelegramJwksService.TelegramClaims(
                "tg-user-123", "alice_tg", "Alice", "https://telesco.pe/pic"));

        h.server().expect(requestTo(ISSUER + "/token"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().contentType(MediaType.APPLICATION_FORM_URLENCODED))
            .andRespond(withSuccess("""
                {"token_type":"Bearer","access_token":"at","id_token":"fake.id.token","expires_in":3600,"scope":"openid profile"}
                """, MediaType.APPLICATION_JSON));

        var user = h.service().exchangeCode("auth-code-xyz", "verifier-abc");

        assertThat(user.telegramId()).isEqualTo("tg-user-123");
        assertThat(user.username()).isEqualTo("alice_tg");
        assertThat(user.displayName()).isEqualTo("Alice");
        assertThat(user.photoUrl()).isEqualTo("https://telesco.pe/pic");
        h.server().verify();
    }

    @Test
    void exchangeCodeRejectsResponseWithoutIdToken() {
        var h = build();

        h.server().expect(requestTo(ISSUER + "/token"))
            .andRespond(withSuccess("""
                {"token_type":"Bearer","access_token":"at","expires_in":3600}
                """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> h.service().exchangeCode("code", "verifier"))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("id_token");
    }

    @Test
    void exchangeCodeTranslatesTelegramErrorToExternal() {
        var h = build();
        h.server().expect(requestTo(ISSUER + "/token"))
            .andRespond(withServerError());

        assertThatThrownBy(() -> h.service().exchangeCode("code", "verifier"))
            .isInstanceOf(ExternalSocialServiceException.class);
    }
}
