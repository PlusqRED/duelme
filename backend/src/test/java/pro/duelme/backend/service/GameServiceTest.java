package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.dto.GameResponse;
import pro.duelme.backend.exception.GameNotFoundException;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class GameServiceTest {

    @Autowired
    private GameService gameService;

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
    void getOrCreateCreatesNewGame() {
        GameResponse response = gameService.getOrCreate("Counter-Strike 2", null, GameCategory.FPS);

        assertThat(response.slug()).isEqualTo("counter-strike-2");
        assertThat(response.name()).isEqualTo("Counter-Strike 2");
        assertThat(response.category()).isEqualTo(GameCategory.FPS);
        assertThat(response.duelCount()).isZero();
        assertThat(gameRepository.findBySlug("counter-strike-2")).isPresent();
    }

    @Test
    void getOrCreateReturnsExistingGame() {
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));

        GameResponse response = gameService.getOrCreate("Valorant", null, GameCategory.MOBA);

        assertThat(response.slug()).isEqualTo("valorant");
        assertThat(response.name()).isEqualTo("Valorant");
        // Category stays as the original, not overwritten
        assertThat(response.category()).isEqualTo(GameCategory.FPS);
        assertThat(gameRepository.findAll()).hasSize(1);
    }

    @Test
    void getOrCreateDefaultsToOtherCategory() {
        GameResponse response = gameService.getOrCreate("My Game", null, null);

        assertThat(response.category()).isEqualTo(GameCategory.OTHER);
    }

    @Test
    void getOrCreateTrimsName() {
        GameResponse response = gameService.getOrCreate("  Chess  ", null, GameCategory.STRATEGY);

        assertThat(response.name()).isEqualTo("Chess");
        assertThat(response.slug()).isEqualTo("chess");
    }

    @Test
    void getOrCreateRejectsEmptyName() {
        assertThatThrownBy(() -> gameService.getOrCreate("", null, null))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> gameService.getOrCreate("   ", null, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getOrCreateRejectsNullName() {
        assertThatThrownBy(() -> gameService.getOrCreate(null, null, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void slugGenerationFromName() {
        assertThat(GameService.toSlug("Counter-Strike 2")).isEqualTo("counter-strike-2");
        assertThat(GameService.toSlug("  Hello   World  ")).isEqualTo("hello-world");
        assertThat(GameService.toSlug("CS2")).isEqualTo("cs2");
        assertThat(GameService.toSlug("Game!!!Name")).isEqualTo("gamename");
        assertThat(GameService.toSlug("--dashes--")).isEqualTo("dashes");
    }

    @Test
    void slugFallbackForNonLatinNames() {
        String slug = GameService.toSlug("\u0428\u0430\u0445\u043c\u0430\u0442\u044b");

        assertThat(slug).startsWith("g-");
        assertThat(slug).isNotEmpty();
    }

    @Test
    void getBySlugReturnsGame() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));

        GameResponse response = gameService.getBySlug("cs2");

        assertThat(response.slug()).isEqualTo("cs2");
        assertThat(response.name()).isEqualTo("Counter-Strike 2");
    }

    @Test
    void getBySlugIsCaseInsensitive() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));

        GameResponse response = gameService.getBySlug("CS2");

        assertThat(response.slug()).isEqualTo("cs2");
    }

    @Test
    void getBySlugThrowsWhenNotFound() {
        assertThatThrownBy(() -> gameService.getBySlug("nonexistent"))
            .isInstanceOf(GameNotFoundException.class);
    }

    @Test
    void listReturnsAllGames() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, null, null));

        List<GameResponse> results = gameService.list(null, null, 50);

        assertThat(results).hasSize(2);
    }

    @Test
    void listFiltersByCategory() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, null, null));

        List<GameResponse> results = gameService.list(GameCategory.FPS, null, 50);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().slug()).isEqualTo("cs2");
    }

    @Test
    void listSearchesByName() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));

        List<GameResponse> results = gameService.list(null, "val", 50);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().slug()).isEqualTo("valorant");
    }

    @Test
    void listFiltersByCategoryAndSearch() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, null, null));

        List<GameResponse> results = gameService.list(GameCategory.FPS, "counter", 50);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().slug()).isEqualTo("cs2");
    }

    @Test
    void listRespectsLimit() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "chess", "Chess", null, GameCategory.STRATEGY, null, null));

        List<GameResponse> results = gameService.list(null, null, 2);

        assertThat(results).hasSize(2);
    }

    @Test
    void listSortsByDuelCountDescending() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        gameRepository.save(new Game(null, "valorant", "Valorant", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, 1, 421614, "valorant", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, 2, 421614, "valorant", "0xbbb", null));
        duelMetaRepository.save(new DuelMeta(null, 3, 421614, "cs2", "0xccc", null));

        List<GameResponse> results = gameService.list(null, null, 50);

        assertThat(results.getFirst().slug()).isEqualTo("valorant");
        assertThat(results.getFirst().duelCount()).isEqualTo(2);
        assertThat(results.get(1).slug()).isEqualTo("cs2");
        assertThat(results.get(1).duelCount()).isEqualTo(1);
    }

    @Test
    void listTruncatesLongSearch() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));

        String longSearch = "a".repeat(100);
        // Should not throw; service truncates to 50 chars
        List<GameResponse> results = gameService.list(null, longSearch, 50);

        assertThat(results).isEmpty();
    }

    @Test
    void listIgnoresBlankSearch() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));

        List<GameResponse> results = gameService.list(null, "   ", 50);

        // Blank search treated as no filter, returns all
        assertThat(results).hasSize(1);
    }

    @Test
    void duelCountReflectsMetaEntries() {
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, 1, 421614, "cs2", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, 2, 421614, "cs2", "0xbbb", null));

        GameResponse response = gameService.getBySlug("cs2");

        assertThat(response.duelCount()).isEqualTo(2);
    }
}
