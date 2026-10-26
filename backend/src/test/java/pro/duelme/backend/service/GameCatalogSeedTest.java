package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.util.List;
import java.util.Map;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

/** {@link GameService#seedCatalog}: the catalog's own games, put in place at every boot. */
@SpringBootTest
@ActiveProfiles("test")
class GameCatalogSeedTest {

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
    void seedCatalogAddsTheGamesItLacks() {
        String nardy = "\u041d\u0430\u0440\u0434\u044b";                                      // Нарды

        gameService.seedCatalog(Map.of(GameCategory.BOARD, List.of("Backgammon", nardy)));

        assertThat(gameRepository.findAll())
            .extracting(Game::slug, Game::name, Game::category)
            .containsExactlyInAnyOrder(
                tuple("backgammon", "Backgammon", GameCategory.BOARD),
                tuple(GameService.toSlug(nardy), nardy, GameCategory.BOARD)
            );
    }

    @Test
    void seedCatalogMovesAKnownGameToItsCategoryAndKeepsItsDuels() {
        gameRepository.save(new Game(null, "chess", "chess", null, GameCategory.STRATEGY, null, null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "chess", "0xaaa", null));
        Game before = gameRepository.findBySlug("chess").orElseThrow();

        gameService.seedCatalog(Map.of(GameCategory.BOARD, List.of("Chess")));

        Game after = gameRepository.findBySlug("chess").orElseThrow();
        assertThat(after.id()).isEqualTo(before.id());
        assertThat(after.createdAt()).isEqualTo(before.createdAt());
        assertThat(after.name()).isEqualTo("Chess");
        assertThat(after.category()).isEqualTo(GameCategory.BOARD);
        assertThat(gameService.getBySlug("chess").duelCount()).isEqualTo(1);
        assertThat(gameRepository.findAll()).hasSize(1);
    }

    @Test
    void seedCatalogLeavesTheGamesPlayersAddedAsTheyAre() {
        gameRepository.save(new Game(null, "my-game", "My Game", null, GameCategory.OTHER, null, null));
        Game before = gameRepository.findBySlug("my-game").orElseThrow();

        gameService.seedCatalog(Map.of(GameCategory.BOARD, List.of("Chess")));

        assertThat(gameRepository.findBySlug("my-game")).contains(before);
        assertThat(gameRepository.findAll()).hasSize(2);
    }

    @Test
    void seedCatalogRejectsOneGameNamedTwiceBeforeWritingAny() {
        // Different spellings, one slug: each boot would rename the game from one to the other.
        var catalog = Map.of(GameCategory.FPS, List.of("CS2"), GameCategory.OTHER, List.of("cs2"));

        assertThatThrownBy(() -> gameService.seedCatalog(catalog))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("twice");
        assertThat(gameRepository.findAll()).isEmpty();
    }

    @Test
    void seedCatalogAgainChangesNothing() {
        var catalog = Map.of(GameCategory.CARD, List.of("Poker", "Durak"), GameCategory.MMO, List.of("Lineage 2"));
        gameService.seedCatalog(catalog);
        List<Game> first = gameRepository.findAll();

        gameService.seedCatalog(catalog);

        assertThat(gameRepository.findAll()).containsExactlyInAnyOrderElementsOf(first);
    }
}
