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
import java.util.Map;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static pro.duelme.backend.support.TestContracts.OTHER_CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.REDEPLOYED_CONTRACT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

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
    void slugFallbackProducesDistinctValuesForDistinctNonLatinNames() {
        String chess = GameService.toSlug("\u0428\u0430\u0445\u043c\u0430\u0442\u044b");      // Шахматы
        String go = GameService.toSlug("\u56f2\u7881");                                        // 囲碁
        String shogi = GameService.toSlug("\u5c06\u68cb");                                     // 将棋

        assertThat(chess).isNotEqualTo(go);
        assertThat(go).isNotEqualTo(shogi);
        assertThat(chess).isNotEqualTo(shogi);
    }

    @Test
    void slugOfANameMixingScriptsKeepsItsNonLatinWords() {
        // Only the Latin remnant used to survive: «Дота 2» and «КС 2» both became "2", one game.
        String dota = GameService.toSlug("\u0414\u043e\u0442\u0430 2");                   // Дота 2
        String cs = GameService.toSlug("\u041a\u0421 2");                                     // КС 2
        String heroes = GameService.toSlug("\u0413\u0435\u0440\u043e\u0438 III");          // Герои III

        assertThat(List.of(dota, cs, heroes)).allMatch(slug -> slug.startsWith("g-"));
        assertThat(dota).isNotEqualTo(cs);
    }

    @Test
    void slugOfAnAccentedLatinNameStaysReadable() {
        assertThat(GameService.toSlug("Pok\u00e9mon Unite")).isEqualTo("pokmon-unite");
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
    void seedCatalogAgainChangesNothing() {
        var catalog = Map.of(GameCategory.CARD, List.of("Poker", "Durak"), GameCategory.MMO, List.of("Lineage 2"));
        gameService.seedCatalog(catalog);
        List<Game> first = gameRepository.findAll();

        gameService.seedCatalog(catalog);

        assertThat(gameRepository.findAll()).containsExactlyInAnyOrderElementsOf(first);
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
    void findBySlugIsEmptyWhenNotFound() {
        assertThat(gameService.findBySlug("nonexistent")).isEmpty();
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
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "valorant", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 2, CHAIN_ID, "valorant", "0xbbb", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 3, CHAIN_ID, "cs2", "0xccc", null));

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
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "cs2", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 2, CHAIN_ID, "cs2", "0xbbb", null));

        GameResponse response = gameService.getBySlug("cs2");

        assertThat(response.duelCount()).isEqualTo(2);
    }

    @Test
    void duelCountIgnoresEveryDeploymentButTheLiveOne() {
        // The badge used to span deployments, on the reasoning that a duel played on a
        // previous contract still happened. From the outside that reads as a bug: a fresh
        // contract with no duels showed badges counting the retired one's.
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "cs2", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, REDEPLOYED_CONTRACT, 1, CHAIN_ID, "cs2", "0xbbb", null));
        duelMetaRepository.save(new DuelMeta(null, CONTRACT, 1, OTHER_CHAIN_ID, "cs2", "0xccc", null));

        // Only the first: the second is a retired contract, the third is the right contract
        // on a chain where it is not what is deployed.
        assertThat(gameService.getBySlug("cs2").duelCount()).isEqualTo(1);
    }

    @Test
    void aRedeployLeavesTheGameStandingAndTheBadgeAtZero() {
        // The point of scoping the count: the catalog is durable, the badge is not. Nothing
        // is deleted for this to happen -- the rows simply stop matching a live deployment.
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, REDEPLOYED_CONTRACT, 1, CHAIN_ID, "cs2", "0xaaa", null));
        duelMetaRepository.save(new DuelMeta(null, REDEPLOYED_CONTRACT, 2, CHAIN_ID, "cs2", "0xbbb", null));

        List<GameResponse> listed = gameService.list(null, null, 50);

        assertThat(listed).singleElement().satisfies(game -> {
            assertThat(game.slug()).isEqualTo("cs2");
            assertThat(game.duelCount()).isZero();
        });
        assertThat(gameRepository.findBySlug("cs2")).isPresent();
        assertThat(duelMetaRepository.findAll()).hasSize(2);
    }

    @Test
    void aRowWithNoDeploymentAtAllCountsForNothing() {
        // What the retired backfill used to guess at. Unknown provenance means it belongs
        // to no deployment, so it belongs in no badge.
        gameRepository.save(new Game(null, "cs2", "Counter-Strike 2", null, GameCategory.FPS, null, null));
        duelMetaRepository.save(new DuelMeta(null, null, 1, CHAIN_ID, "cs2", "0xaaa", null));

        assertThat(gameService.getBySlug("cs2").duelCount()).isZero();
    }
}
