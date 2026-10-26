package pro.duelme.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.model.Game;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** The shipped application.yml's catalog, bound and written the way a boot does it. */
@SpringBootTest
@ActiveProfiles("test")
class GameCatalogConfigTest {

    @Autowired
    @Qualifier("seedGameCatalog")
    private ApplicationRunner seedGameCatalog;

    @Autowired
    private CatalogProperties catalog;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private DuelMetaRepository duelMetaRepository;

    @Test
    void bootPutsTheShippedCatalogInPlace() throws Exception {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();

        seedGameCatalog.run(new DefaultApplicationArguments());

        long named = catalog.games().values().stream().mapToLong(List::size).sum();
        assertThat(gameRepository.count()).isEqualTo(named);
        assertThat(gameRepository.findBySlug("chess")).map(Game::category).contains(GameCategory.BOARD);
        assertThat(gameRepository.findBySlug("world-of-warcraft")).map(Game::category).contains(GameCategory.MMO);
        // Нарды, a game of its own beside Backgammon.
        assertThat(gameRepository.findAll())
            .filteredOn(game -> game.name().equals("Нарды"))
            .extracting(Game::category)
            .containsExactly(GameCategory.BOARD);
    }
}
