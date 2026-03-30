package pro.duelme.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
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

    @BeforeEach
    void setUp() {
        gameRepository.deleteAll();
    }

    @Test
    void listGamesReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listGamesReturnsAll() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listGamesFiltersByCategory() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games").param("category", "FPS"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].slug").value("cs2"));
    }

    @Test
    void listGamesSearchesByName() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, 0, 0, null, null));

        mockMvc.perform(get("/api/v1/games").param("search", "val"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].slug").value("valorant"));
    }

    @Test
    void getGameBySlug() throws Exception {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, 0, 0, null, null));

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
}
