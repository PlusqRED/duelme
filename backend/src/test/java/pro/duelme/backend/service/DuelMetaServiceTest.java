package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.exception.NotAuthorizedException;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class DuelMetaServiceTest {

    @Autowired
    private DuelMetaService duelMetaService;

    @Autowired
    private DuelMetaRepository duelMetaRepository;

    @Autowired
    private GameRepository gameRepository;

    @BeforeEach
    void setUp() {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();
    }

    @Test
    void attachGameCreatesNewMeta() {
        var request = new DuelMetaRequest("Counter-Strike 2", null, GameCategory.FPS);

        DuelMetaResponse response = duelMetaService.attachGame(1, 421614, "0xCreator", request);

        assertThat(response.duelId()).isEqualTo(1);
        assertThat(response.chainId()).isEqualTo(421614);
        assertThat(response.gameSlug()).isEqualTo("counter-strike-2");
        assertThat(response.gameName()).isEqualTo("Counter-Strike 2");
        assertThat(response.category()).isEqualTo(GameCategory.FPS);
        assertThat(response.creatorAddress()).isEqualTo("0xcreator");
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void attachGameNormalizesCallerAddress() {
        var request = new DuelMetaRequest("CS2", null, null);

        DuelMetaResponse response = duelMetaService.attachGame(1, 421614, "0xABCDEF", request);

        assertThat(response.creatorAddress()).isEqualTo("0xabcdef");
    }

    @Test
    void attachGameCreatesGameIfNotExists() {
        var request = new DuelMetaRequest("New Game", null, GameCategory.STRATEGY);

        duelMetaService.attachGame(1, 421614, "0xcreator", request);

        assertThat(gameRepository.findBySlug("new-game")).isPresent();
    }

    @Test
    void attachGameRejectsNonCreatorFromModifyingExistingMeta() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator", request);

        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);

        assertThatThrownBy(() -> duelMetaService.attachGame(1, 421614, "0xother", updateRequest))
            .isInstanceOf(NotAuthorizedException.class)
            .hasMessageContaining("Only the duel creator");
    }

    @Test
    void attachGameAllowsCreatorToUpdateGame() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator", request);

        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        DuelMetaResponse response = duelMetaService.attachGame(1, 421614, "0xcreator", updateRequest);

        assertThat(response.gameSlug()).isEqualTo("valorant");
        assertThat(response.gameName()).isEqualTo("Valorant");
        assertThat(response.creatorAddress()).isEqualTo("0xcreator");
        // Only one meta record should exist for this duel
        assertThat(duelMetaRepository.findAll()).hasSize(1);
    }

    @Test
    void attachGameCreatorCheckIsCaseInsensitive() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xCreator", request);

        // Same address, different case -- should succeed
        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        DuelMetaResponse response = duelMetaService.attachGame(1, 421614, "0xCREATOR", updateRequest);

        assertThat(response.gameSlug()).isEqualTo("valorant");
    }

    @Test
    void attachGamePreservesIdOnUpdate() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator", request);
        String originalId = duelMetaRepository.findByDuelIdAndChainId(1, 421614).orElseThrow().id();

        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        duelMetaService.attachGame(1, 421614, "0xcreator", updateRequest);
        String updatedId = duelMetaRepository.findByDuelIdAndChainId(1, 421614).orElseThrow().id();

        assertThat(updatedId).isEqualTo(originalId);
        assertThat(duelMetaRepository.findAll()).hasSize(1);
    }

    @Test
    void attachGameAllowsDifferentDuelsFromDifferentCreators() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator-a", request);
        duelMetaService.attachGame(2, 421614, "0xcreator-b", request);

        assertThat(duelMetaRepository.findAll()).hasSize(2);
    }

    @Test
    void getByDuelReturnsMetadata() {
        var request = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        duelMetaService.attachGame(5, 421614, "0xcreator", request);

        DuelMetaResponse response = duelMetaService.getByDuel(5, 421614);

        assertThat(response).isNotNull();
        assertThat(response.duelId()).isEqualTo(5);
        assertThat(response.gameSlug()).isEqualTo("valorant");
        assertThat(response.gameName()).isEqualTo("Valorant");
    }

    @Test
    void getByDuelReturnsNullForNonExistent() {
        DuelMetaResponse response = duelMetaService.getByDuel(999, 421614);

        assertThat(response).isNull();
    }

    @Test
    void getByDuelReturnsNullForWrongChainId() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator", request);

        DuelMetaResponse response = duelMetaService.getByDuel(1, 1);

        assertThat(response).isNull();
    }

    @Test
    void getByGameSlugReturnsDuelsForGame() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator", request);
        duelMetaService.attachGame(2, 421614, "0xcreator", request);

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("cs2", 50);

        assertThat(results).hasSize(2);
        assertThat(results).allMatch(r -> r.gameSlug().equals("cs2"));
    }

    @Test
    void getByGameSlugReturnsEmptyForUnknownSlug() {
        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("nonexistent", 50);

        assertThat(results).isEmpty();
    }

    @Test
    void getByGameSlugRespectsLimit() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, 421614, "0xcreator", request);
        duelMetaService.attachGame(2, 421614, "0xcreator", request);
        duelMetaService.attachGame(3, 421614, "0xcreator", request);

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("cs2", 2);

        assertThat(results).hasSize(2);
    }

    @Test
    void getByDuelIdsReturnsMatchingMetas() {
        duelMetaService.attachGame(1, 421614, "0xcreator", new DuelMetaRequest("CS2", null, GameCategory.FPS));
        duelMetaService.attachGame(3, 421614, "0xcreator", new DuelMetaRequest("Dota 2", null, GameCategory.MOBA));

        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(421614, List.of(1L, 2L, 3L));

        assertThat(results).hasSize(2);
        assertThat(results).extracting(DuelMetaResponse::duelId).containsExactlyInAnyOrder(1L, 3L);
        assertThat(results).extracting(DuelMetaResponse::category).containsExactlyInAnyOrder(GameCategory.FPS, GameCategory.MOBA);
    }

    @Test
    void getByDuelIdsReturnsEmptyForEmptyInput() {
        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(421614, List.of());

        assertThat(results).isEmpty();
    }

    @Test
    void getByDuelIdsReturnsEmptyForWrongChain() {
        duelMetaService.attachGame(1, 421614, "0xcreator", new DuelMetaRequest("CS2", null, null));

        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(1, List.of(1L));

        assertThat(results).isEmpty();
    }
}
