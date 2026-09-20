package pro.duelme.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.bson.Document;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.dto.DuelMetaRequest;
import pro.duelme.backend.dto.DuelMetaResponse;
import pro.duelme.backend.exception.NotAuthorizedException;
import pro.duelme.backend.model.GameCategory;
import pro.duelme.backend.repository.DuelMetaRepository;
import pro.duelme.backend.repository.GameRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static pro.duelme.backend.support.TestContracts.REDEPLOYED_CONTRACT;
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

    @Autowired
    private MongoTemplate template;

    @BeforeEach
    void setUp() {
        duelMetaRepository.deleteAll();
        gameRepository.deleteAll();
    }

    @Test
    void attachGameCreatesNewMeta() {
        var request = new DuelMetaRequest("Counter-Strike 2", null, GameCategory.FPS);

        DuelMetaResponse response = duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xCreator", request);

        assertThat(response.duelId()).isEqualTo(1);
        assertThat(response.chainId()).isEqualTo(CHAIN_ID);
        assertThat(response.contractAddress()).isEqualTo(CONTRACT);
        assertThat(response.gameSlug()).isEqualTo("counter-strike-2");
        assertThat(response.gameName()).isEqualTo("Counter-Strike 2");
        assertThat(response.category()).isEqualTo(GameCategory.FPS);
        assertThat(response.creatorAddress()).isEqualTo("0xcreator");
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void attachGameNormalizesCallerAddress() {
        var request = new DuelMetaRequest("CS2", null, null);

        DuelMetaResponse response = duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xABCDEF", request);

        assertThat(response.creatorAddress()).isEqualTo("0xabcdef");
    }

    @Test
    void attachGameNormalizesContractAddress() {
        var request = new DuelMetaRequest("CS2", null, null);

        DuelMetaResponse response = duelMetaService.attachGame(
            1, CHAIN_ID, CONTRACT.toUpperCase().replace("0X", "0x"), "0xcreator", request);

        assertThat(response.contractAddress()).isEqualTo(CONTRACT);
        // A checksummed address from the client must reach the same row as a lowercase one.
        assertThat(duelMetaService.getByDuel(1, CHAIN_ID, CONTRACT)).isNotNull();
    }

    @Test
    void attachGameCreatesGameIfNotExists() {
        var request = new DuelMetaRequest("New Game", null, GameCategory.STRATEGY);

        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);

        assertThat(gameRepository.findBySlug("new-game")).isPresent();
    }

    @Test
    void attachGameRejectsNonCreatorFromModifyingExistingMeta() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);

        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);

        assertThatThrownBy(() -> duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xother", updateRequest))
            .isInstanceOf(NotAuthorizedException.class)
            .hasMessageContaining("Only the duel creator");
    }

    @Test
    void attachGameAllowsCreatorToUpdateGame() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);

        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        DuelMetaResponse response = duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", updateRequest);

        assertThat(response.gameSlug()).isEqualTo("valorant");
        assertThat(response.gameName()).isEqualTo("Valorant");
        assertThat(response.creatorAddress()).isEqualTo("0xcreator");
        // Only one meta record should exist for this duel
        assertThat(duelMetaRepository.findAll()).hasSize(1);
    }

    @Test
    void attachGameCreatorCheckIsCaseInsensitive() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xCreator", request);

        // Same address, different case -- should succeed
        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        DuelMetaResponse response = duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xCREATOR", updateRequest);

        assertThat(response.gameSlug()).isEqualTo("valorant");
    }

    @Test
    void attachGamePreservesIdOnUpdate() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);
        String originalId = duelMetaRepository
            .findByChainIdAndContractAddressAndDuelId(CHAIN_ID, CONTRACT, 1).orElseThrow().id();

        var updateRequest = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", updateRequest);
        String updatedId = duelMetaRepository
            .findByChainIdAndContractAddressAndDuelId(CHAIN_ID, CONTRACT, 1).orElseThrow().id();

        assertThat(updatedId).isEqualTo(originalId);
        assertThat(duelMetaRepository.findAll()).hasSize(1);
    }

    @Test
    void attachGameAllowsDifferentDuelsFromDifferentCreators() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator-a", request);
        duelMetaService.attachGame(2, CHAIN_ID, CONTRACT, "0xcreator-b", request);

        assertThat(duelMetaRepository.findAll()).hasSize(2);
    }

    @Test
    void attachGameLetsANewDeploymentReuseADuelIdTakenByAnother() {
        // The 403 this change removes: duel 1 belonged to someone else under the
        // previous deployment, and the new duel 1 is a different duel entirely.
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xold-creator", new DuelMetaRequest("CS2", null, null));

        DuelMetaResponse response = duelMetaService.attachGame(
            1, CHAIN_ID, REDEPLOYED_CONTRACT, "0xnew-creator", new DuelMetaRequest("Valorant", null, null));

        assertThat(response.creatorAddress()).isEqualTo("0xnew-creator");
        assertThat(response.gameSlug()).isEqualTo("valorant");
        // And the old row keeps its game rather than being overwritten.
        assertThat(duelMetaService.getByDuel(1, CHAIN_ID, CONTRACT).gameSlug()).isEqualTo("cs2");
        assertThat(duelMetaRepository.findAll()).hasSize(2);
    }

    @Test
    void getByDuelReturnsMetadata() {
        var request = new DuelMetaRequest("Valorant", null, GameCategory.FPS);
        duelMetaService.attachGame(5, CHAIN_ID, CONTRACT, "0xcreator", request);

        DuelMetaResponse response = duelMetaService.getByDuel(5, CHAIN_ID, CONTRACT);

        assertThat(response).isNotNull();
        assertThat(response.duelId()).isEqualTo(5);
        assertThat(response.gameSlug()).isEqualTo("valorant");
        assertThat(response.gameName()).isEqualTo("Valorant");
    }

    @Test
    void getByDuelReturnsNullForNonExistent() {
        DuelMetaResponse response = duelMetaService.getByDuel(999, CHAIN_ID, CONTRACT);

        assertThat(response).isNull();
    }

    @Test
    void getByDuelReturnsNullForWrongChainId() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);

        DuelMetaResponse response = duelMetaService.getByDuel(1, 1, CONTRACT);

        assertThat(response).isNull();
    }

    @Test
    void getByDuelReturnsNullForAnotherDeployment() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);

        DuelMetaResponse response = duelMetaService.getByDuel(1, CHAIN_ID, REDEPLOYED_CONTRACT);

        assertThat(response).isNull();
    }

    @Test
    void getByGameSlugReturnsDuelsForGame() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);
        duelMetaService.attachGame(2, CHAIN_ID, CONTRACT, "0xcreator", request);

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("cs2", CHAIN_ID, CONTRACT, 50);

        assertThat(results).hasSize(2);
        assertThat(results).allMatch(r -> r.gameSlug().equals("cs2"));
    }

    @Test
    void getByGameSlugReturnsEmptyForUnknownSlug() {
        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("nonexistent", CHAIN_ID, CONTRACT, 50);

        assertThat(results).isEmpty();
    }

    @Test
    void getByGameSlugRespectsLimit() {
        var request = new DuelMetaRequest("CS2", null, null);
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", request);
        duelMetaService.attachGame(2, CHAIN_ID, CONTRACT, "0xcreator", request);
        duelMetaService.attachGame(3, CHAIN_ID, CONTRACT, "0xcreator", request);

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("cs2", CHAIN_ID, CONTRACT, 2);

        assertThat(results).hasSize(2);
    }

    @Test
    void getByGameSlugKeepsTheNewestRowsWhenTheLimitCuts() {
        // createdAt is set by auditing on insert, so the rows that need a
        // controlled age are written underneath it.
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", new DuelMetaRequest("CS2", null, null));
        Instant now = Instant.now();
        insertRow(2, "cs2", now.minus(Duration.ofDays(10)));
        insertRow(3, "cs2", now.plus(Duration.ofDays(10)));

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("cs2", CHAIN_ID, CONTRACT, 2);

        // Insertion order would have served duels 1 and 2 and hidden the newest
        // one for good — the duels a game page is there to show.
        assertThat(results).extracting(DuelMetaResponse::duelId).containsExactly(3L, 1L);
    }

    private void insertRow(long duelId, String gameSlug, Instant createdAt) {
        template.getCollection("duelMeta").insertOne(new Document()
            .append("contractAddress", CONTRACT)
            .append("duelId", duelId)
            .append("chainId", CHAIN_ID)
            .append("gameSlug", gameSlug)
            .append("creatorAddress", "0xcreator")
            .append("createdAt", Date.from(createdAt)));
    }

    @Test
    void getByGameSlugFiltersBeforeApplyingTheLimit() {
        var request = new DuelMetaRequest("CS2", null, null);
        // Rows this deployment must not see, written first so a post-cap filter
        // would spend the whole limit on them and return nothing.
        duelMetaService.attachGame(1, 1, CONTRACT, "0xcreator", request);
        duelMetaService.attachGame(2, 1, CONTRACT, "0xcreator", request);
        duelMetaService.attachGame(3, CHAIN_ID, REDEPLOYED_CONTRACT, "0xcreator", request);
        duelMetaService.attachGame(4, CHAIN_ID, CONTRACT, "0xcreator", request);

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("cs2", CHAIN_ID, CONTRACT, 2);

        assertThat(results).extracting(DuelMetaResponse::duelId).containsExactly(4L);
    }

    @Test
    void getByGameSlugAcceptsAnUncanonicalisedSlug() {
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", new DuelMetaRequest("CS2", null, null));

        List<DuelMetaResponse> results = duelMetaService.getByGameSlug("CS2", CHAIN_ID, CONTRACT, 50);

        assertThat(results).hasSize(1);
    }

    @Test
    void getByDuelIdsReturnsMatchingMetas() {
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", new DuelMetaRequest("CS2", null, GameCategory.FPS));
        duelMetaService.attachGame(3, CHAIN_ID, CONTRACT, "0xcreator", new DuelMetaRequest("Dota 2", null, GameCategory.MOBA));

        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(CHAIN_ID, CONTRACT, List.of(1L, 2L, 3L));

        assertThat(results).hasSize(2);
        assertThat(results).extracting(DuelMetaResponse::duelId).containsExactlyInAnyOrder(1L, 3L);
        assertThat(results).extracting(DuelMetaResponse::category).containsExactlyInAnyOrder(GameCategory.FPS, GameCategory.MOBA);
    }

    @Test
    void getByDuelIdsReturnsEmptyForEmptyInput() {
        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(CHAIN_ID, CONTRACT, List.of());

        assertThat(results).isEmpty();
    }

    @Test
    void getByDuelIdsReturnsEmptyForWrongChain() {
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", new DuelMetaRequest("CS2", null, null));

        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(1, CONTRACT, List.of(1L));

        assertThat(results).isEmpty();
    }

    @Test
    void getByDuelIdsSkipsAnotherDeploymentsRows() {
        duelMetaService.attachGame(1, CHAIN_ID, CONTRACT, "0xcreator", new DuelMetaRequest("CS2", null, null));
        duelMetaService.attachGame(1, CHAIN_ID, REDEPLOYED_CONTRACT, "0xcreator", new DuelMetaRequest("Dota 2", null, null));

        List<DuelMetaResponse> results = duelMetaService.getByDuelIds(CHAIN_ID, REDEPLOYED_CONTRACT, List.of(1L));

        assertThat(results).extracting(DuelMetaResponse::gameSlug).containsExactly("dota-2");
    }
}
