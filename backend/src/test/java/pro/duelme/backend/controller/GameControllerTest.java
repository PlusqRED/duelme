package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;
import pro.duelme.backend.security.WalletAuthenticationToken;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameControllerTest {

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
    void healthReturnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void listGamesReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listGamesReturnsAll() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));

        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listGamesFiltersByCategory() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, null, null));

        mockMvc.perform(get("/api/v1/games").param("category", "FPS"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].slug").value("cs2"));
    }

    @Test
    void listGamesSearchesByName() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));

        mockMvc.perform(get("/api/v1/games").param("search", "val"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].slug").value("valorant"));
    }

    @Test
    void getGameBySlug() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));

        mockMvc.perform(get("/api/v1/games/cs2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Counter-Strike 2"))
            .andExpect(jsonPath("$.category").value("FPS"));
    }

    @Test
    void getGameBySlugReturns404() throws Exception {
        mockMvc.perform(get("/api/v1/games/nonexistent"))
            .andExpect(status().isNotFound());
    }

    @Test
    void duelCountComputedFromDuelMeta() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "cs2", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 2, CHAIN_ID, "cs2", "0xbbb", null));

        mockMvc.perform(get("/api/v1/games/cs2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.duelCount").value(2));
    }

    @Test
    void listGamesSortedByPopularity() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "valorant", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 2, CHAIN_ID, "valorant", "0xbbb", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 3, CHAIN_ID, "cs2", "0xccc", null));

        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slug").value("valorant"))
            .andExpect(jsonPath("$[0].duelCount").value(2))
            .andExpect(jsonPath("$[1].slug").value("cs2"))
            .andExpect(jsonPath("$[1].duelCount").value(1));
    }

    @Test
    void createGameRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/games")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Apex Legends", "category": "FPS"}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void createGameCreatesNewGame() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/games")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Apex Legends", "category": "FPS"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.slug").value("apex-legends"))
            .andExpect(jsonPath("$.name").value("Apex Legends"))
            .andExpect(jsonPath("$.category").value("FPS"))
            .andExpect(jsonPath("$.duelCount").value(0));
    }

    @Test
    void createGameReturnsExistingOnDuplicateSlug() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/games")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "CS2", "category": "MOBA"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.slug").value("cs2"))
            .andExpect(jsonPath("$.name").value("Counter-Strike 2"))
            .andExpect(jsonPath("$.category").value("FPS"));
    }

    @Test
    void createGameValidatesBlankName() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/games")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "", "category": "FPS"}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createGameValidatesNameTooLong() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");
        String longName = "x".repeat(51);

        mockMvc.perform(post("/api/v1/games")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "%s", "category": "FPS"}
                    """.formatted(longName)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createGameValidatesNullCategory() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/games")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Some Game"}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createGameRejectsUnknownCategory() throws Exception {
        var auth = new WalletAuthenticationToken("0xcreator");

        mockMvc.perform(post("/api/v1/games")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Some Game", "category": "ROGUELIKE"}
                    """))
            .andExpect(status().isBadRequest());
    }
}
