package pro.duelme.backend.config;

import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.test.context.ActiveProfiles;
import pro.duelme.backend.model.DuelMeta;
import pro.duelme.backend.repository.DuelMetaRepository;

import static pro.duelme.backend.support.TestContracts.CHAIN_ID;
import static pro.duelme.backend.support.TestContracts.CONTRACT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest
@ActiveProfiles("test")
class DuelMetaBackfillRunnerTest {

    /** No deployment is configured for this one, so the backfill has nothing to infer. */
    private static final int UNCONFIGURED_CHAIN = 1;

    @Autowired
    private DuelMetaBackfillRunner runner;

    @Autowired
    private ContractProperties contracts;

    @Autowired
    private MongoTemplate template;

    @Autowired
    private DuelMetaRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    /** A row as it was written before {@code contractAddress} existed: no such field at all. */
    private void insertLegacyRow(int chainId) {
        template.getCollection("duelMeta").insertOne(new Document()
            .append("duelId", 1L)
            .append("chainId", chainId)
            .append("gameSlug", "cs2")
            .append("creatorAddress", "0xcreator"));
    }

    private void run() {
        runner.run(new DefaultApplicationArguments());
    }

    @Test
    void stampsLegacyRowsWithTheDeploymentLiveOnTheirChain() {
        insertLegacyRow(CHAIN_ID);

        run();

        assertThat(repository.findAll())
            .singleElement()
            .extracting(DuelMeta::contractAddress)
            .isEqualTo(contracts.duelMe().get(CHAIN_ID));
    }

    @Test
    void isSafeToRunTwice() {
        insertLegacyRow(CHAIN_ID);
        run();
        String id = repository.findAll().getFirst().id();

        assertThatCode(this::run).doesNotThrowAnyException();

        assertThat(repository.findAll())
            .singleElement()
            .satisfies(meta -> {
                assertThat(meta.id()).isEqualTo(id);
                assertThat(meta.contractAddress()).isEqualTo(contracts.duelMe().get(CHAIN_ID));
            });
    }

    @Test
    void leavesAlreadyStampedRowsAlone() {
        repository.save(new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "cs2", "0xcreator", null));

        run();

        assertThat(repository.findAll())
            .singleElement()
            .extracting(DuelMeta::contractAddress)
            .isEqualTo(CONTRACT);
    }

    @Test
    void leavesRowsOnUnconfiguredChainsUnstamped() {
        // Nothing to infer for a chain with no configured deployment, so the row
        // keeps its null rather than being given an address from another chain.
        insertLegacyRow(UNCONFIGURED_CHAIN);

        run();

        assertThat(repository.findAll())
            .singleElement()
            .extracting(DuelMeta::contractAddress)
            .isNull();
    }

    @Test
    void dropsTheLegacyIndexAndLeavesTheNewOneStanding() {
        template.indexOps(DuelMeta.class).createIndex(new Index()
            .on("duelId", Sort.Direction.ASC)
            .on("chainId", Sort.Direction.ASC)
            .unique()
            .named(DuelMeta.LEGACY_UNIQUE_INDEX));

        run();

        assertThat(template.indexOps(DuelMeta.class).getIndexInfo())
            .noneMatch(index -> DuelMeta.LEGACY_UNIQUE_INDEX.equals(index.getName()));
        assertThat(template.indexOps(DuelMeta.class).getIndexInfo())
            .anyMatch(index -> DuelMeta.UNIQUE_INDEX.equals(index.getName()));
    }

    @Test
    void dropsNothingWhenTheLegacyIndexIsAlreadyGone() {
        assertThatCode(this::run).doesNotThrowAnyException();
    }
}
