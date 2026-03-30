package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DuelMetaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private DuelMetaRepository duelMetaRepository;

    @BeforeEach
    void setUp() {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();
    }

    @Test
    void attachGameRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2", "wagerAmount": 10000000}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void attachGameCreatesMetaAndGame() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "Counter-Strike 2", "category": "FPS", "wagerAmount": 5000000}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.duelId").value(1))
            .andExpect(jsonPath("$.chainId").value(421614))
            .andExpect(jsonPath("$.gameSlug").value("counter-strike-2"))
            .andExpect(jsonPath("$.gameName").value("Counter-Strike 2"))
            .andExpect(jsonPath("$.creatorAddress").value("0xcreator"));

        mockMvc.perform(get("/api/v1/games/counter-strike-2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Counter-Strike 2"));
    }

    @Test
    void getDuelMetaReturnsMetadata() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/5/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "Valorant", "wagerAmount": 3000000}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/duels/5/meta").param("chainId", "421614"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gameSlug").value("valorant"));
    }

    @Test
    void getDuelMetaReturns404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/duels/999/meta").param("chainId", "421614"))
            .andExpect(status().isNotFound());
    }

    @Test
    void listDuelsByGame() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2", "wagerAmount": 10000000}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/duels/2/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": "CS2", "wagerAmount": 10000000}
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/duels/meta").param("gameSlug", "cs2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void attachGameValidatesBlankName() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/duels/1/meta")
                .param("chainId", "421614")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"gameName": ""}
                    """))
            .andExpect(status().isBadRequest());
    }
}
