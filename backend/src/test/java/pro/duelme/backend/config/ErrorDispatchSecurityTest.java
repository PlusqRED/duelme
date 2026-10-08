package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pro.duelme.backend.service.DuelMetaService;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;

/**
 * Errors Spring raises itself must reach the client with their own status, not as 401.
 *
 * <p>Runs over real HTTP on purpose: MockMvc never performs the container's ERROR dispatch
 * to {@code /error}, which is exactly where {@code denyAll} used to turn every 400 and 500
 * into an empty 401.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ErrorDispatchSecurityTest {

    private static final String LEAKED_DETAIL = "duel-meta-store-exploded";

    private final HttpClient http = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    // Mocked so one permitAll endpoint can throw an unhandled exception; the games
    // endpoints below keep the real GameService.
    @MockitoBean
    private DuelMetaService duelMetaService;

    @ParameterizedTest
    @ValueSource(strings = {
        "/api/v1/games?limit=abc",
        "/api/v1/games?limit=-1",
        "/api/v1/games?category=NOPE",
        "/api/v1/duels/meta",
    })
    void badRequestOnPublicEndpointReturns400(String path) throws Exception {
        assertThat(get(path).statusCode()).isEqualTo(400);
    }

    @Test
    void zeroLimitStillReturnsEmptyList() throws Exception {
        var response = get("/api/v1/games?limit=0");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("[]");
    }

    @Test
    void unhandledExceptionReturns500WithoutDetails() throws Exception {
        when(duelMetaService.getByDuel(anyLong(), anyInt(), anyString()))
            .thenThrow(new IllegalStateException(LEAKED_DETAIL));

        var response = get("/api/v1/duels/1/meta?chainId=" + CHAIN_ID + "&contractAddress=" + CONTRACT);

        assertThat(response.statusCode()).isEqualTo(500);
        assertThat(response.body())
            .doesNotContain(LEAKED_DETAIL)
            .doesNotContain("IllegalStateException")
            .doesNotContain("trace")
            .doesNotContain("at pro.duelme");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/profiles/me", "/error", "/api/v1/nope"})
    void deniedGetStaysUnauthorized(String path) throws Exception {
        assertThat(get(path).statusCode()).isEqualTo(401);
    }

    @Test
    void createGameWithoutTokenStaysUnauthorized() throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/v1/games"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"name\":\"Chess\",\"category\":\"STRATEGY\"}"))
            .build();

        assertThat(http.send(request, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
    }

    private HttpResponse<String> get(String path) throws IOException, InterruptedException {
        return http.send(HttpRequest.newBuilder(uri(path)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }
}
