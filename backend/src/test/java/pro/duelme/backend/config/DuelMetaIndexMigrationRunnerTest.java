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
class DuelMetaIndexMigrationRunnerTest {

    @Autowired
    private DuelMetaIndexMigrationRunner runner;

    @Autowired
    private MongoTemplate template;

    @Autowired
    private DuelMetaRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    /** A row as it was written before {@code contractAddress} existed: no such field at all. */
    private void insertLegacyRow(long duelId) {
        template.getCollection("duelMeta").insertOne(new Document()
            .append("duelId", duelId)
            .append("chainId", CHAIN_ID)
            .append("gameSlug", "cs2")
            .append("creatorAddress", "0xcreator"));
    }

    private void run() {
        runner.run(new DefaultApplicationArguments());
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

    @Test
    void leavesLegacyRowsUnstamped() {
        // Pinned because it is a decision, not an omission. Stamping these with whatever
        // deployment is configured at boot is only right until a redeploy, and on
        // 2026-09-20 prod took the release and the redeploy together: nine May duels were
        // stamped onto a contract that had never seen them, onto the very ids it was about
        // to hand out. Unknown beats wrong here.
        insertLegacyRow(1);

        run();

        assertThat(repository.findAll())
            .singleElement()
            .extracting(DuelMeta::contractAddress)
            .isNull();
    }

    @Test
    void anUnstampedRowDoesNotOccupyTheIdOnARealDeployment() {
        insertLegacyRow(1);

        run();

        assertThat(repository.findByChainIdAndContractAddressAndDuelId(CHAIN_ID, CONTRACT, 1))
            .isEmpty();
        assertThatCode(() -> repository.save(
            new DuelMeta(null, CONTRACT, 1, CHAIN_ID, "valorant", "0xother", null)))
            .doesNotThrowAnyException();
    }

    @Test
    void isSafeToRunTwice() {
        insertLegacyRow(1);
        run();

        assertThatCode(this::run).doesNotThrowAnyException();

        assertThat(repository.findAll()).hasSize(1);
    }
}
