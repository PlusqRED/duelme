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
import pro.duelme.backend.model.FaucetClaim;
import pro.duelme.backend.repository.FaucetClaimRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest
@ActiveProfiles("test")
class FaucetClaimIndexMigrationRunnerTest {

    private static final String WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private static final String TOKEN = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    @Autowired
    private FaucetClaimIndexMigrationRunner runner;

    @Autowired
    private MongoTemplate template;

    @Autowired
    private FaucetClaimRepository repository;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    /** A row as it was written before {@code tokenAddress} existed: no such field at all. */
    private void insertLegacyRow() {
        template.getCollection("faucet_claims").insertOne(new Document()
            .append("walletAddress", WALLET)
            .append("ethTxHash", "0xeth")
            .append("usdtTxHash", "0xusdt"));
    }

    private void run() {
        runner.run(new DefaultApplicationArguments());
    }

    @Test
    void dropsTheLegacyIndexAndLeavesTheNewOneStanding() {
        // No named(...), exactly as the superseded MongoConfig bean created it — which is
        // why the constant spells the name Mongo generates rather than the field name.
        template.indexOps(FaucetClaim.class)
            .createIndex(new Index().on("walletAddress", Sort.Direction.ASC).unique());

        run();

        assertThat(template.indexOps(FaucetClaim.class).getIndexInfo())
            .noneMatch(index -> FaucetClaim.LEGACY_UNIQUE_INDEX.equals(index.getName()));
        assertThat(template.indexOps(FaucetClaim.class).getIndexInfo())
            .anyMatch(index -> FaucetClaim.UNIQUE_INDEX.equals(index.getName()));
    }

    @Test
    void dropsNothingWhenTheLegacyIndexIsAlreadyGone() {
        assertThatCode(this::run).doesNotThrowAnyException();
    }

    @Test
    void leavesLegacyRowsUnstamped() {
        // Pinned because it is a decision, not an omission: the configured MockUSDT on the
        // first boot carrying this runner may already be the one a redeploy just installed,
        // and stamping legacy rows with it would lock their wallets out of a token they drew
        // nothing from. Null matches no lookup, so the wallet simply gets one more claim.
        insertLegacyRow();

        run();

        assertThat(repository.findAll())
            .singleElement()
            .extracting(FaucetClaim::tokenAddress)
            .isNull();
    }

    @Test
    void anUnstampedRowDoesNotStandInTheWayOfAClaimAgainstTheLiveToken() {
        insertLegacyRow();

        run();

        assertThat(repository.findByWalletAddressAndTokenAddress(WALLET, TOKEN)).isEmpty();
        assertThatCode(() -> repository.save(
            new FaucetClaim(null, WALLET, TOKEN, "0xeth2", "0xusdt2", null)))
            .doesNotThrowAnyException();
    }

    @Test
    void isSafeToRunTwice() {
        insertLegacyRow();
        run();

        assertThatCode(this::run).doesNotThrowAnyException();

        assertThat(repository.findAll()).hasSize(1);
    }
}
