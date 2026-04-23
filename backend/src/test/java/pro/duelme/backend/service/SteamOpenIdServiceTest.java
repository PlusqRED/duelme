package pro.duelme.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import pro.duelme.backend.config.SocialLinkProperties;
import pro.duelme.backend.exception.ExternalSocialServiceException;
import pro.duelme.backend.exception.SocialVerificationFailedException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SteamOpenIdServiceTest {

    private static final String RETURN_URL =
        "http://localhost:8080/api/v1/profiles/me/social/steam/callback";

    private SocialLinkProperties props() {
        return new SocialLinkProperties(
            "http://localhost:3000",
            "any-secret",
            new SocialLinkProperties.Steam("test-api-key", RETURN_URL),
            new SocialLinkProperties.Telegram(null, null, null, null)
        );
    }

    private record ServiceWithServer(SteamOpenIdService service, MockRestServiceServer server) {}

    private static String returnTo(String state) {
        return RETURN_URL + "?state=" + state;
    }

    private ServiceWithServer build() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new ServiceWithServer(new SteamOpenIdService(builder.build(), props()), server);
    }

    @Test
    void buildAuthUrlContainsOpenIdParamsAndState() {
        var set = build();

        String url = set.service().buildAuthUrl("state-token-123");

        assertThat(url).startsWith(SteamOpenIdService.STEAM_OPENID_URL);
        assertThat(url).contains("openid.mode=checkid_setup");
        assertThat(url).contains("openid.ns=http");
        assertThat(url).contains("state=state-token-123");
        assertThat(url).contains("identifier_select");
    }

    @Test
    void verifyCallbackWithValidResponseReturnsSteamId() {
        var set = build();
        set.server().expect(requestTo(SteamOpenIdService.STEAM_OPENID_URL))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess(
                "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n",
                MediaType.TEXT_PLAIN));

        Map<String, String> params = Map.ofEntries(
            Map.entry("state", "state-123"),
            Map.entry("openid.mode", "id_res"),
            Map.entry("openid.ns", "http://specs.openid.net/auth/2.0"),
            Map.entry("openid.claimed_id", "https://steamcommunity.com/openid/id/76561197960287930"),
            Map.entry("openid.identity", "https://steamcommunity.com/openid/id/76561197960287930"),
            Map.entry("openid.op_endpoint", "https://steamcommunity.com/openid/login"),
            Map.entry("openid.return_to", returnTo("state-123")),
            Map.entry("openid.response_nonce", "2026-04-23T00:00:00Zabc"),
            Map.entry("openid.assoc_handle", "handle"),
            Map.entry("openid.signed", "signed,op_endpoint,claimed_id"),
            Map.entry("openid.sig", "sig-value")
        );

        String steamId = set.service().verifyCallback(params);

        assertThat(steamId).isEqualTo("76561197960287930");
        set.server().verify();
    }

    @Test
    void verifyCallbackWithInvalidResponseThrows() {
        var set = build();
        set.server().expect(requestTo(SteamOpenIdService.STEAM_OPENID_URL))
            .andRespond(withSuccess("is_valid:false\n", MediaType.TEXT_PLAIN));

        Map<String, String> params = Map.of(
            "state", "state-123",
            "openid.mode", "id_res",
            "openid.claimed_id", "https://steamcommunity.com/openid/id/76561197960287930",
            "openid.return_to", returnTo("state-123")
        );

        assertThatThrownBy(() -> set.service().verifyCallback(params))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyCallbackRejectsMissingClaimedId() {
        var set = build();
        Map<String, String> params = Map.of("openid.mode", "id_res");

        assertThatThrownBy(() -> set.service().verifyCallback(params))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("claimed_id");
    }

    @Test
    void verifyCallbackRejectsWrongMode() {
        var set = build();
        Map<String, String> params = Map.of(
            "openid.mode", "cancel",
            "openid.claimed_id", "https://steamcommunity.com/openid/id/76561197960287930"
        );

        assertThatThrownBy(() -> set.service().verifyCallback(params))
            .isInstanceOf(SocialVerificationFailedException.class);
    }

    @Test
    void verifyCallbackRejectsMalformedClaimedId() {
        var set = build();
        Map<String, String> params = Map.of(
            "state", "state-123",
            "openid.mode", "id_res",
            "openid.claimed_id", "https://not-steam.example.com/openid/id/1234",
            "openid.return_to", returnTo("state-123")
        );

        assertThatThrownBy(() -> set.service().verifyCallback(params))
            .isInstanceOf(SocialVerificationFailedException.class)
            .hasMessageContaining("claimed_id");
    }

    @Test
    void verifyCallbackTranslatesSteamErrorToExternalSocialService() {
        var set = build();
        set.server().expect(requestTo(SteamOpenIdService.STEAM_OPENID_URL))
            .andRespond(withServerError());

        Map<String, String> params = Map.of(
            "state", "state-123",
            "openid.mode", "id_res",
            "openid.claimed_id", "https://steamcommunity.com/openid/id/76561197960287930",
            "openid.return_to", returnTo("state-123")
        );

        assertThatThrownBy(() -> set.service().verifyCallback(params))
            .isInstanceOf(ExternalSocialServiceException.class);
    }
}
