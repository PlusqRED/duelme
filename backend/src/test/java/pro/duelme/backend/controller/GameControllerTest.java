package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
        duelMetaRepository.save(new DuelMeta(null, 1, 421614, "cs2", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, 2, 421614, "cs2", "0xbbb", null));

        mockMvc.perform(get("/api/v1/games/cs2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.duelCount").value(2));
    }

    @Test
    void listGamesSortedByPopularity() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, 1, 421614, "valorant", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, 2, 421614, "valorant", "0xbbb", null));
        duelMetaRepository.save(new DuelMeta(null, 3, 421614, "cs2", "0xccc", null));

        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slug").value("valorant"))
            .andExpect(jsonPath("$[0].duelCount").value(2))
            .andExpect(jsonPath("$[1].slug").value("cs2"))
            .andExpect(jsonPath("$[1].duelCount").value(1));
    }
}
