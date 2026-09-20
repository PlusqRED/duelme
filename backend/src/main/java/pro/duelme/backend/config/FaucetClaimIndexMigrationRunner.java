package pro.duelme.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import pro.duelme.backend.model.FaucetClaim;

/**
 * Retires the single-field unique index that keyed a faucet claim by wallet alone,
 * so the {@code walletAddress + tokenAddress} one can take its place.
 *
 * <p>It deliberately does <strong>not</strong> stamp the rows that predate
 * {@code tokenAddress}, and that is the whole design decision here.
 * {@link DuelMetaBackfillRunner} can infer its missing field, because the deployment
 * live on a row's chain is the one it was written under. The same inference here is a
 * guess: a redeploy edits {@code duelme.faucet.mock-usdt-address} and the backend
 * redeploys in the same release, so the first boot carrying this runner can easily be
 * one where the configured MockUSDT is already the *new* token — and stamping legacy
 * rows with it would lock every past claimant out of a token they drew nothing from,
 * which is precisely the bug this key change removes.
 *
 * <p>Left null, those rows match no lookup, so each pre-migration wallet gets one more
 * claim and the rows stay as the history they are. On a testnet faucet an extra claim
 * costs a drip; a wrong stamp costs a tester their access, silently. The asymmetry is
 * not close, so this does not guess.
 *
 * <p>Idempotent — a second run finds no index — so it is safe on every boot and needs
 * no "has this run" marker.
 */
@Order(FaucetClaimIndexMigrationRunner.ORDER)
@Component
public class FaucetClaimIndexMigrationRunner implements ApplicationRunner {

    /**
     * Before {@code MongoConfig#ensureFaucetClaimIndexes}, which declares
     * {@code ORDER + 1}. The single-field predecessor has to be gone before the compound
     * index goes in — left standing it keeps rejecting the second claim that a MockUSDT
     * redeploy is supposed to allow, and the change would be inert.
     */
    public static final int ORDER = 0;

    private static final Logger log = LoggerFactory.getLogger(FaucetClaimIndexMigrationRunner.class);

    private final MongoTemplate template;

    public FaucetClaimIndexMigrationRunner(MongoTemplate template) {
        this.template = template;
    }

    @Override
    public void run(ApplicationArguments args) {
        var ops = template.indexOps(FaucetClaim.class);
        boolean present = ops.getIndexInfo().stream()
            .anyMatch(index -> FaucetClaim.LEGACY_UNIQUE_INDEX.equals(index.getName()));
        if (present) {
            ops.dropIndex(FaucetClaim.LEGACY_UNIQUE_INDEX);
            log.info("Dropped the legacy {} index on faucet_claims", FaucetClaim.LEGACY_UNIQUE_INDEX);
        }
    }
}
